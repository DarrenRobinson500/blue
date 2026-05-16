"""
Unit tests for the import processor service.
Covers: full valid file, mixed errors, column check failure, duplicate primary key.
"""
import io
from datetime import date
from django.core.files.uploadedfile import InMemoryUploadedFile
from django.test import TestCase

from apps.actuarial.models import DataSchema, SchemaField, DataImport, PolicyRecord, ImportValidationError
from apps.actuarial.services.import_processor import process_import


def _make_schema(product_code='TEST', fields_spec=None):
    schema = DataSchema.objects.create(
        name='Test Schema',
        product_code=product_code,
        file_format='csv',
        delimiter=',',
        has_header_row=True,
        encoding='utf-8',
        version=1,
    )
    if fields_spec is None:
        fields_spec = [
            {'field_name': 'policy_id', 'display_name': 'Policy ID', 'data_type': 'string',
             'is_required': True, 'is_primary_key': True, 'max_length': 20},
            {'field_name': 'age', 'display_name': 'Age', 'data_type': 'integer',
             'is_required': True, 'min_value': 0, 'max_value': 120},
            {'field_name': 'gender', 'display_name': 'Gender', 'data_type': 'string',
             'is_required': True, 'allowed_values': ['M', 'F', 'U']},
            {'field_name': 'dob', 'display_name': 'Date of Birth', 'data_type': 'date',
             'is_required': True, 'date_format': '%d/%m/%Y'},
            {'field_name': 'premium', 'display_name': 'Premium', 'data_type': 'decimal',
             'is_required': False, 'min_value': 0},
        ]
    for i, spec in enumerate(fields_spec, start=1):
        SchemaField.objects.create(schema=schema, field_order=i, **spec)
    return schema


def _make_import(schema, csv_content):
    file_bytes = csv_content.encode('utf-8')
    uploaded = InMemoryUploadedFile(
        file=io.BytesIO(file_bytes),
        field_name='uploaded_file',
        name='test.csv',
        content_type='text/csv',
        size=len(file_bytes),
        charset='utf-8',
    )
    return DataImport.objects.create(
        schema=schema,
        import_reference='TEST-REF',
        data_date=date(2026, 4, 30),
        uploaded_file=uploaded,
        status='pending',
    )


class TestFullValidFile(TestCase):
    def test_all_rows_validated(self):
        schema = _make_schema()
        csv = (
            'policy_id,age,gender,dob,premium\n'
            'P001,35,M,15/06/1991,1200.50\n'
            'P002,42,F,03/03/1984,980.00\n'
            'P003,28,U,22/11/1997,\n'
        )
        di = _make_import(schema, csv)
        process_import(di)
        di.refresh_from_db()

        self.assertEqual(di.status, 'validated')
        self.assertEqual(di.row_count_raw, 3)
        self.assertEqual(di.row_count_valid, 3)
        self.assertEqual(di.row_count_error, 0)
        self.assertEqual(PolicyRecord.objects.filter(data_import=di).count(), 3)
        self.assertEqual(ImportValidationError.objects.filter(data_import=di).count(), 0)

        r1 = PolicyRecord.objects.get(data_import=di, primary_key_value='P001')
        self.assertEqual(r1.data['age'], 35)
        self.assertEqual(r1.data['dob'], '1991-06-15')
        self.assertAlmostEqual(r1.data['premium'], 1200.50, places=2)
        self.assertFalse(r1.has_errors)

        r3 = PolicyRecord.objects.get(data_import=di, primary_key_value='P003')
        self.assertIsNone(r3.data['premium'])  # optional field, empty → None


class TestMixedErrors(TestCase):
    def test_rows_with_errors_flagged(self):
        schema = _make_schema()
        csv = (
            'policy_id,age,gender,dob,premium\n'
            'P001,35,M,15/06/1991,1200.00\n'     # valid
            'P002,not_a_number,F,03/03/1984,\n'  # wrong type on age
            'P003,200,M,22/11/1997,\n'            # out of range on age
            'P004,30,X,01/01/1996,\n'             # invalid gender
            'P005,25,M,bad_date,\n'               # wrong type on dob
            'P006,,F,01/01/2000,\n'               # missing required (age)
        )
        di = _make_import(schema, csv)
        process_import(di)
        di.refresh_from_db()

        self.assertEqual(di.status, 'validated')
        self.assertEqual(di.row_count_raw, 6)
        self.assertEqual(di.row_count_valid, 1)
        self.assertEqual(di.row_count_error, 5)

        errors = ImportValidationError.objects.filter(data_import=di)
        error_types = {e.error_type for e in errors}
        self.assertIn('wrong_type', error_types)
        self.assertIn('out_of_range', error_types)
        self.assertIn('invalid_value', error_types)
        self.assertIn('missing_required', error_types)

        p1 = PolicyRecord.objects.get(data_import=di, primary_key_value='P001')
        self.assertFalse(p1.has_errors)
        p2 = PolicyRecord.objects.get(data_import=di, primary_key_value='P002')
        self.assertTrue(p2.has_errors)


class TestColumnCheckFailure(TestCase):
    def test_missing_required_column_fails_import(self):
        schema = _make_schema()
        # Missing 'gender' column — which is required
        csv = (
            'policy_id,age,dob,premium\n'
            'P001,35,15/06/1991,1200.00\n'
        )
        di = _make_import(schema, csv)
        process_import(di)
        di.refresh_from_db()

        self.assertEqual(di.status, 'failed')
        self.assertEqual(PolicyRecord.objects.filter(data_import=di).count(), 0)

        err = ImportValidationError.objects.get(data_import=di)
        self.assertEqual(err.field_name, 'FILE')
        self.assertEqual(err.error_type, 'row_level')
        self.assertIn('gender', err.message)


class TestDuplicatePrimaryKey(TestCase):
    def test_duplicate_pk_flagged_on_second_occurrence(self):
        schema = _make_schema()
        csv = (
            'policy_id,age,gender,dob,premium\n'
            'P001,35,M,15/06/1991,1200.00\n'
            'P002,42,F,03/03/1984,980.00\n'
            'P001,28,U,22/11/1997,500.00\n'  # duplicate of P001
        )
        di = _make_import(schema, csv)
        process_import(di)
        di.refresh_from_db()

        self.assertEqual(di.status, 'validated')
        self.assertEqual(di.row_count_error, 1)

        dup_err = ImportValidationError.objects.get(
            data_import=di, error_type='duplicate_primary_key'
        )
        self.assertEqual(dup_err.raw_value, 'P001')
        self.assertEqual(dup_err.row_number, 3)

    def test_supersede_prior_validated_import(self):
        schema = _make_schema()
        csv_v1 = 'policy_id,age,gender,dob,premium\nP001,35,M,15/06/1991,1200.00\n'
        csv_v2 = 'policy_id,age,gender,dob,premium\nP001,35,M,15/06/1991,1300.00\n'

        di1 = _make_import(schema, csv_v1)
        process_import(di1)
        di1.refresh_from_db()
        self.assertEqual(di1.status, 'validated')

        di2 = _make_import(schema, csv_v2)
        process_import(di2)

        di1.refresh_from_db()
        di2.refresh_from_db()
        self.assertEqual(di1.status, 'superseded')
        self.assertEqual(di2.status, 'validated')
