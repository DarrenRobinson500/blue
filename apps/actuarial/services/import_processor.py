"""
CSV import processing service.
Called synchronously from the upload API endpoint.
No background tasks in Phase 1.
"""
import io
from datetime import datetime
from decimal import Decimal, InvalidOperation

from django.utils import timezone

from apps.actuarial.models import DataImport, ImportValidationError, PolicyRecord


def _coerce_boolean(raw):
    """Return (True|False, None) or (raw, error_message)."""
    low = str(raw).strip().lower()
    if low in ('1', 'true', 'yes', 'y'):
        return True, None
    if low in ('0', 'false', 'no', 'n', ''):
        return False, None
    return raw, f"Expected boolean (true/false/yes/no/1/0), got '{raw}'"


def _coerce_value(raw, field):
    """
    Attempt to coerce raw string to the field's data_type.
    Returns (coerced_value, error_message_or_None).
    Dates are stored as ISO 8601 strings.
    """
    stripped = str(raw).strip() if raw is not None else ''

    if field.data_type == 'string':
        return stripped, None

    if field.data_type == 'integer':
        try:
            return int(stripped), None
        except (ValueError, TypeError):
            return raw, f"Expected integer, got '{stripped}'"

    if field.data_type == 'decimal':
        try:
            return float(Decimal(stripped)), None
        except (InvalidOperation, ValueError, TypeError):
            return raw, f"Expected decimal number, got '{stripped}'"

    if field.data_type == 'date':
        fmt = field.date_format or '%d/%m/%Y'
        try:
            parsed = datetime.strptime(stripped, fmt)
            return parsed.strftime('%Y-%m-%d'), None
        except (ValueError, TypeError):
            return raw, f"Expected date in format '{fmt}', got '{stripped}'"

    if field.data_type == 'boolean':
        return _coerce_boolean(stripped)

    return raw, None


def process_import(data_import: DataImport):
    """
    Main entry point. Mutates data_import status and counts in place.
    All DB writes are committed as they happen (no transaction wrapping —
    the caller's request cycle provides the outer transaction boundary).
    """
    data_import.status = DataImport.Status.PARSING
    data_import.parse_started_at = timezone.now()
    data_import.save(update_fields=['status', 'parse_started_at'])

    schema = data_import.schema

    if schema.file_format == 'fixed_width':
        ImportValidationError.objects.create(
            data_import=data_import,
            row_number=0,
            field_name='FILE',
            error_type=ImportValidationError.ErrorType.ROW_LEVEL,
            raw_value='',
            message='Fixed-width file parsing is not supported in Phase 1.',
        )
        _fail(data_import)
        return

    # --- Step 1: read file ---
    try:
        content = data_import.uploaded_file.read().decode(schema.encoding)
    except Exception as e:
        ImportValidationError.objects.create(
            data_import=data_import,
            row_number=0,
            field_name='FILE',
            error_type=ImportValidationError.ErrorType.ROW_LEVEL,
            raw_value='',
            message=f'Could not read or decode file: {e}',
        )
        _fail(data_import)
        return

    fields = list(schema.fields.order_by('field_order'))
    delimiter = schema.delimiter or ','

    # Parse into rows using csv module (avoids pandas overhead for simple CSVs)
    import csv
    reader = csv.reader(io.StringIO(content), delimiter=delimiter)
    all_rows = list(reader)

    if not all_rows:
        ImportValidationError.objects.create(
            data_import=data_import,
            row_number=0,
            field_name='FILE',
            error_type=ImportValidationError.ErrorType.ROW_LEVEL,
            raw_value='',
            message='File is empty.',
        )
        _fail(data_import)
        return

    # --- Step 2: column presence check ---
    if schema.has_header_row:
        header_row = [h.strip() for h in all_rows[0]]
        data_rows = all_rows[1:]
        required_fields = [f for f in fields if f.is_required]
        missing = [f.field_name for f in required_fields if f.field_name not in header_row]
        if missing:
            ImportValidationError.objects.create(
                data_import=data_import,
                row_number=0,
                field_name='FILE',
                error_type=ImportValidationError.ErrorType.ROW_LEVEL,
                raw_value='',
                message=f'Required column(s) not found in file header: {", ".join(repr(m) for m in missing)}',
            )
            _fail(data_import)
            return
        col_index = {name: i for i, name in enumerate(header_row)}
    else:
        data_rows = all_rows
        col_index = {f.field_name: f.field_order - 1 for f in fields}

    # --- Step 3: row-by-row validation ---
    pk_field = next((f for f in fields if f.is_primary_key), None)
    seen_pks = {}  # pk_value → first row_number
    pk_errors = set()  # row numbers with duplicate PK errors

    row_count_raw = len(data_rows)
    row_count_error = 0
    records_to_create = []
    errors_to_create = []

    for row_idx, row in enumerate(data_rows):
        row_number = row_idx + 1
        row_errors = []
        data = {}

        for field in fields:
            col_i = col_index.get(field.field_name)
            if col_i is None:
                # Column not present — only possible for non-required fields with no-header
                raw = ''
            else:
                raw = row[col_i].strip() if col_i < len(row) else ''

            # Missing required
            if field.is_required and raw == '':
                row_errors.append(ImportValidationError(
                    data_import=data_import,
                    row_number=row_number,
                    field_name=field.field_name,
                    error_type=ImportValidationError.ErrorType.MISSING_REQUIRED,
                    raw_value='',
                    message=f"'{field.field_name}' is required but was empty.",
                ))
                data[field.field_name] = raw
                continue

            if raw == '' and not field.is_required:
                data[field.field_name] = None
                continue

            # Type coerce
            coerced, coerce_err = _coerce_value(raw, field)
            if coerce_err:
                row_errors.append(ImportValidationError(
                    data_import=data_import,
                    row_number=row_number,
                    field_name=field.field_name,
                    error_type=ImportValidationError.ErrorType.WRONG_TYPE,
                    raw_value=raw,
                    message=coerce_err,
                ))
                data[field.field_name] = raw
                continue

            # Range checks (only for successfully coerced numerics)
            if field.data_type in ('integer', 'decimal') and coerce_err is None:
                if field.min_value is not None and coerced < float(field.min_value):
                    row_errors.append(ImportValidationError(
                        data_import=data_import,
                        row_number=row_number,
                        field_name=field.field_name,
                        error_type=ImportValidationError.ErrorType.OUT_OF_RANGE,
                        raw_value=raw,
                        message=f"'{field.field_name}' value {coerced} is below minimum {field.min_value}.",
                    ))
                    data[field.field_name] = raw
                    continue
                if field.max_value is not None and coerced > float(field.max_value):
                    row_errors.append(ImportValidationError(
                        data_import=data_import,
                        row_number=row_number,
                        field_name=field.field_name,
                        error_type=ImportValidationError.ErrorType.OUT_OF_RANGE,
                        raw_value=raw,
                        message=f"'{field.field_name}' value {coerced} exceeds maximum {field.max_value}.",
                    ))
                    data[field.field_name] = raw
                    continue

            # Max length (strings)
            if field.data_type == 'string' and field.max_length and len(coerced) > field.max_length:
                row_errors.append(ImportValidationError(
                    data_import=data_import,
                    row_number=row_number,
                    field_name=field.field_name,
                    error_type=ImportValidationError.ErrorType.OUT_OF_RANGE,
                    raw_value=raw,
                    message=f"'{field.field_name}' length {len(coerced)} exceeds max_length {field.max_length}.",
                ))
                data[field.field_name] = raw
                continue

            # Allowed values
            if field.allowed_values is not None:
                check = str(coerced) if not isinstance(coerced, str) else coerced
                allowed_str = [str(v) for v in field.allowed_values]
                if check not in allowed_str:
                    row_errors.append(ImportValidationError(
                        data_import=data_import,
                        row_number=row_number,
                        field_name=field.field_name,
                        error_type=ImportValidationError.ErrorType.INVALID_VALUE,
                        raw_value=raw,
                        message=f"'{field.field_name}' value '{coerced}' not in allowed values: {field.allowed_values}.",
                    ))
                    data[field.field_name] = raw
                    continue

            data[field.field_name] = coerced

        # Primary key duplicate check
        pk_value = ''
        if pk_field:
            pk_value = str(data.get(pk_field.field_name, ''))
            if pk_value in seen_pks:
                row_errors.append(ImportValidationError(
                    data_import=data_import,
                    row_number=row_number,
                    field_name=pk_field.field_name,
                    error_type=ImportValidationError.ErrorType.DUPLICATE_PRIMARY_KEY,
                    raw_value=pk_value,
                    message=f"Duplicate primary key '{pk_value}' — first seen at row {seen_pks[pk_value]}.",
                ))
                pk_errors.add(row_number)
            else:
                seen_pks[pk_value] = row_number

        has_errors = len(row_errors) > 0
        if has_errors:
            row_count_error += 1

        records_to_create.append(PolicyRecord(
            data_import=data_import,
            row_number=row_number,
            primary_key_value=pk_value,
            data=data,
            has_errors=has_errors,
        ))
        errors_to_create.extend(row_errors)

    PolicyRecord.objects.bulk_create(records_to_create)
    ImportValidationError.objects.bulk_create(errors_to_create)

    # --- Step 4: supersede prior validated imports for same (schema, data_date) ---
    DataImport.objects.filter(
        schema=schema,
        data_date=data_import.data_date,
        status=DataImport.Status.VALIDATED,
    ).exclude(pk=data_import.pk).update(status=DataImport.Status.SUPERSEDED)

    # --- Step 5: finalise ---
    data_import.status = DataImport.Status.VALIDATED
    data_import.row_count_raw = row_count_raw
    data_import.row_count_valid = row_count_raw - row_count_error
    data_import.row_count_error = row_count_error
    data_import.parse_completed_at = timezone.now()
    data_import.save(update_fields=[
        'status', 'row_count_raw', 'row_count_valid', 'row_count_error', 'parse_completed_at',
    ])


def _fail(data_import: DataImport):
    data_import.status = DataImport.Status.FAILED
    data_import.parse_completed_at = timezone.now()
    data_import.row_count_raw = 0
    data_import.row_count_valid = 0
    data_import.row_count_error = 0
    data_import.save(update_fields=[
        'status', 'parse_completed_at', 'row_count_raw', 'row_count_valid', 'row_count_error',
    ])
