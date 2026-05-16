from rest_framework import serializers
from .models import DataSchema, SchemaField, DataImport, PolicyRecord, ImportValidationError


class SchemaFieldSerializer(serializers.ModelSerializer):
    class Meta:
        model = SchemaField
        fields = [
            'id', 'field_name', 'display_name', 'field_order', 'data_type', 'date_format',
            'is_required', 'is_primary_key', 'max_length', 'min_value', 'max_value',
            'allowed_values', 'fixed_width_start', 'fixed_width_end', 'notes',
        ]


class DataSchemaListSerializer(serializers.ModelSerializer):
    field_count = serializers.SerializerMethodField()
    created_by_email = serializers.CharField(source='created_by.email', read_only=True, default=None)

    class Meta:
        model = DataSchema
        fields = [
            'id', 'name', 'description', 'product_code', 'file_format', 'delimiter',
            'has_header_row', 'encoding', 'version', 'is_active', 'created_by',
            'created_by_email', 'created_at', 'notes', 'field_count',
        ]
        read_only_fields = ['created_at']

    def get_field_count(self, obj):
        return obj.fields.count()


class DataSchemaDetailSerializer(DataSchemaListSerializer):
    fields_list = SchemaFieldSerializer(source='fields', many=True, read_only=True)

    class Meta(DataSchemaListSerializer.Meta):
        fields = DataSchemaListSerializer.Meta.fields + ['fields_list']


class DataSchemaCreateSerializer(serializers.ModelSerializer):
    fields_list = SchemaFieldSerializer(many=True, write_only=True, source='fields_data')

    class Meta:
        model = DataSchema
        fields = [
            'name', 'description', 'product_code', 'file_format', 'delimiter',
            'has_header_row', 'encoding', 'notes', 'fields_list',
        ]

    def create(self, validated_data):
        fields_data = validated_data.pop('fields_data', [])
        schema = DataSchema.objects.create(**validated_data)
        for fd in fields_data:
            SchemaField.objects.create(schema=schema, **fd)
        return schema


class DataImportListSerializer(serializers.ModelSerializer):
    schema_name = serializers.CharField(source='schema.name', read_only=True)
    product_code = serializers.CharField(source='schema.product_code', read_only=True)
    uploaded_by_email = serializers.CharField(source='uploaded_by.email', read_only=True, default=None)

    class Meta:
        model = DataImport
        fields = [
            'id', 'schema', 'schema_name', 'product_code', 'import_reference', 'data_date',
            'uploaded_by', 'uploaded_by_email', 'uploaded_at', 'status',
            'row_count_raw', 'row_count_valid', 'row_count_error',
            'parse_started_at', 'parse_completed_at', 'notes',
        ]
        read_only_fields = [
            'uploaded_at', 'status', 'row_count_raw', 'row_count_valid', 'row_count_error',
            'parse_started_at', 'parse_completed_at',
        ]


class ImportValidationErrorSerializer(serializers.ModelSerializer):
    class Meta:
        model = ImportValidationError
        fields = ['id', 'row_number', 'field_name', 'error_type', 'raw_value', 'message']


class PolicyRecordSerializer(serializers.ModelSerializer):
    class Meta:
        model = PolicyRecord
        fields = ['id', 'row_number', 'primary_key_value', 'data', 'has_errors', 'created_at']
