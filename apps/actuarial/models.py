from django.db import models
from django.conf import settings


class DataSchema(models.Model):
    class FileFormat(models.TextChoices):
        CSV = 'csv', 'CSV'
        FIXED_WIDTH = 'fixed_width', 'Fixed Width'

    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    product_code = models.CharField(max_length=50)
    file_format = models.CharField(max_length=20, choices=FileFormat.choices, default=FileFormat.CSV)
    delimiter = models.CharField(max_length=10, default=',')
    has_header_row = models.BooleanField(default=True)
    encoding = models.CharField(max_length=20, default='utf-8')
    version = models.PositiveIntegerField(default=1)
    is_active = models.BooleanField(default=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL
    )
    created_at = models.DateTimeField(auto_now_add=True)
    notes = models.TextField(blank=True)

    class Meta:
        db_table = 'actuarial_data_schema'
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.name} v{self.version}'


class SchemaField(models.Model):
    class DataType(models.TextChoices):
        STRING = 'string', 'String'
        INTEGER = 'integer', 'Integer'
        DECIMAL = 'decimal', 'Decimal'
        DATE = 'date', 'Date'
        BOOLEAN = 'boolean', 'Boolean'

    schema = models.ForeignKey(DataSchema, on_delete=models.CASCADE, related_name='fields')
    field_name = models.CharField(max_length=100)
    display_name = models.CharField(max_length=255)
    field_order = models.PositiveIntegerField()
    data_type = models.CharField(max_length=20, choices=DataType.choices)
    date_format = models.CharField(max_length=50, blank=True)
    is_required = models.BooleanField(default=True)
    is_primary_key = models.BooleanField(default=False)
    max_length = models.PositiveIntegerField(null=True, blank=True)
    min_value = models.DecimalField(max_digits=20, decimal_places=6, null=True, blank=True)
    max_value = models.DecimalField(max_digits=20, decimal_places=6, null=True, blank=True)
    allowed_values = models.JSONField(null=True, blank=True)
    fixed_width_start = models.PositiveIntegerField(null=True, blank=True)
    fixed_width_end = models.PositiveIntegerField(null=True, blank=True)
    notes = models.TextField(blank=True)

    class Meta:
        db_table = 'actuarial_schema_field'
        ordering = ['field_order']

    def __str__(self):
        return f'{self.schema.name} — {self.field_name}'


class DataImport(models.Model):
    class Status(models.TextChoices):
        PENDING = 'pending', 'Pending'
        PARSING = 'parsing', 'Parsing'
        VALIDATED = 'validated', 'Validated'
        FAILED = 'failed', 'Failed'
        SUPERSEDED = 'superseded', 'Superseded'

    schema = models.ForeignKey(DataSchema, on_delete=models.PROTECT, related_name='imports')
    import_reference = models.CharField(max_length=100)
    data_date = models.DateField()
    uploaded_file = models.FileField(upload_to='data_imports/')
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL
    )
    uploaded_at = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    row_count_raw = models.PositiveIntegerField(null=True, blank=True)
    row_count_valid = models.PositiveIntegerField(null=True, blank=True)
    row_count_error = models.PositiveIntegerField(null=True, blank=True)
    parse_started_at = models.DateTimeField(null=True, blank=True)
    parse_completed_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True)

    class Meta:
        db_table = 'actuarial_data_import'
        ordering = ['-uploaded_at']

    def __str__(self):
        return self.import_reference


class PolicyRecord(models.Model):
    data_import = models.ForeignKey(DataImport, on_delete=models.PROTECT, related_name='records')
    row_number = models.PositiveIntegerField()
    primary_key_value = models.CharField(max_length=100)
    data = models.JSONField()
    has_errors = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'actuarial_policy_record'
        indexes = [
            models.Index(fields=['data_import', 'primary_key_value']),
            models.Index(fields=['data_import']),
        ]

    def __str__(self):
        return f'{self.data_import.import_reference} row {self.row_number}'


class ImportValidationError(models.Model):
    class ErrorType(models.TextChoices):
        MISSING_REQUIRED = 'missing_required', 'Missing Required'
        WRONG_TYPE = 'wrong_type', 'Wrong Type'
        OUT_OF_RANGE = 'out_of_range', 'Out of Range'
        INVALID_VALUE = 'invalid_value', 'Invalid Value'
        DUPLICATE_PRIMARY_KEY = 'duplicate_primary_key', 'Duplicate Primary Key'
        ROW_LEVEL = 'row_level', 'Row Level'

    data_import = models.ForeignKey(DataImport, on_delete=models.CASCADE, related_name='errors')
    row_number = models.PositiveIntegerField()
    field_name = models.CharField(max_length=100)
    error_type = models.CharField(max_length=30, choices=ErrorType.choices)
    raw_value = models.TextField(blank=True)
    message = models.TextField()

    class Meta:
        db_table = 'actuarial_import_validation_error'
        ordering = ['row_number', 'field_name']

    def __str__(self):
        return f'{self.data_import.import_reference} row {self.row_number} — {self.field_name}'
