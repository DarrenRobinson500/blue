from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser

from .models import DataSchema, SchemaField, DataImport, PolicyRecord, ImportValidationError
from .serialisers import (
    DataSchemaListSerializer, DataSchemaDetailSerializer, DataSchemaCreateSerializer,
    SchemaFieldSerializer, DataImportListSerializer,
    ImportValidationErrorSerializer, PolicyRecordSerializer,
)
from .services.import_processor import process_import


class StatsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from django.db.models import Max, Sum
        active_schemas = DataSchema.objects.filter(is_active=True).count()
        total_imports = DataImport.objects.count()
        validated = DataImport.objects.filter(status='validated').count()
        failed = DataImport.objects.filter(status='failed').count()
        latest_row = DataImport.objects.filter(status='validated').aggregate(m=Max('data_date'))
        latest_data_date = latest_row['m']
        total_records = PolicyRecord.objects.count()
        records_with_errors = PolicyRecord.objects.filter(has_errors=True).count()
        return Response({
            'active_schemas': active_schemas,
            'total_imports': total_imports,
            'validated_imports': validated,
            'failed_imports': failed,
            'latest_data_date': str(latest_data_date) if latest_data_date else None,
            'total_policy_records': total_records,
            'records_with_errors': records_with_errors,
        })


class SchemaListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = DataSchema.objects.prefetch_related('fields')
        if request.query_params.get('is_active') == 'true':
            qs = qs.filter(is_active=True)
        if request.query_params.get('product_code'):
            qs = qs.filter(product_code=request.query_params['product_code'])
        return Response(DataSchemaListSerializer(qs, many=True).data)

    def post(self, request):
        ser = DataSchemaCreateSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        schema = ser.save(created_by=request.user)
        return Response(DataSchemaDetailSerializer(schema).data, status=status.HTTP_201_CREATED)


class SchemaDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def _get(self, pk):
        try:
            return DataSchema.objects.prefetch_related('fields').get(pk=pk)
        except DataSchema.DoesNotExist:
            return None

    def get(self, request, pk):
        obj = self._get(pk)
        if not obj:
            return Response(status=status.HTTP_404_NOT_FOUND)
        return Response(DataSchemaDetailSerializer(obj).data)

    def patch(self, request, pk):
        obj = self._get(pk)
        if not obj:
            return Response(status=status.HTTP_404_NOT_FOUND)
        # Metadata only — not fields
        allowed = {'name', 'description', 'notes', 'is_active'}
        data = {k: v for k, v in request.data.items() if k in allowed}
        ser = DataSchemaListSerializer(obj, data=data, partial=True)
        ser.is_valid(raise_exception=True)
        ser.save()
        return Response(DataSchemaDetailSerializer(obj).data)


class SchemaNewVersionView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            original = DataSchema.objects.prefetch_related('fields').get(pk=pk)
        except DataSchema.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

        original.is_active = False
        original.save(update_fields=['is_active'])

        new_schema = DataSchema.objects.create(
            name=original.name,
            description=original.description,
            product_code=original.product_code,
            file_format=original.file_format,
            delimiter=original.delimiter,
            has_header_row=original.has_header_row,
            encoding=original.encoding,
            version=original.version + 1,
            is_active=True,
            created_by=request.user,
            notes=f'New version based on v{original.version}',
        )
        for field in original.fields.all():
            SchemaField.objects.create(
                schema=new_schema,
                field_name=field.field_name,
                display_name=field.display_name,
                field_order=field.field_order,
                data_type=field.data_type,
                date_format=field.date_format,
                is_required=field.is_required,
                is_primary_key=field.is_primary_key,
                max_length=field.max_length,
                min_value=field.min_value,
                max_value=field.max_value,
                allowed_values=field.allowed_values,
                fixed_width_start=field.fixed_width_start,
                fixed_width_end=field.fixed_width_end,
                notes=field.notes,
            )
        return Response(DataSchemaDetailSerializer(new_schema).data, status=status.HTTP_201_CREATED)


class SchemaFieldListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        try:
            schema = DataSchema.objects.get(pk=pk)
        except DataSchema.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)
        return Response(SchemaFieldSerializer(schema.fields.all(), many=True).data)

    def post(self, request, pk):
        try:
            schema = DataSchema.objects.get(pk=pk)
        except DataSchema.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)
        if schema.imports.exists():
            return Response(
                {'error': 'Cannot add fields to a schema that has existing imports.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        ser = SchemaFieldSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        field = ser.save(schema=schema)
        return Response(SchemaFieldSerializer(field).data, status=status.HTTP_201_CREATED)


class SchemaFieldDeleteView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, pk, field_id):
        try:
            schema = DataSchema.objects.get(pk=pk)
        except DataSchema.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)
        if schema.imports.exists():
            return Response(
                {'error': 'Cannot remove fields from a schema that has existing imports.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        deleted, _ = SchemaField.objects.filter(pk=field_id, schema=schema).delete()
        if not deleted:
            return Response(status=status.HTTP_404_NOT_FOUND)
        return Response(status=status.HTTP_204_NO_CONTENT)


class ImportListView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get(self, request):
        qs = DataImport.objects.select_related('schema', 'uploaded_by')
        if request.query_params.get('schema'):
            qs = qs.filter(schema_id=request.query_params['schema'])
        if request.query_params.get('status'):
            qs = qs.filter(status=request.query_params['status'])
        if request.query_params.get('data_date'):
            qs = qs.filter(data_date=request.query_params['data_date'])
        return Response(DataImportListSerializer(qs, many=True).data)

    def post(self, request):
        schema_id = request.data.get('schema')
        import_reference = request.data.get('import_reference', '').strip()
        data_date = request.data.get('data_date')
        uploaded_file = request.FILES.get('uploaded_file')

        if not all([schema_id, import_reference, data_date, uploaded_file]):
            return Response(
                {'error': 'schema, import_reference, data_date, and uploaded_file are all required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            schema = DataSchema.objects.get(pk=schema_id, is_active=True)
        except DataSchema.DoesNotExist:
            return Response({'error': 'Schema not found or inactive.'}, status=status.HTTP_400_BAD_REQUEST)

        data_import = DataImport.objects.create(
            schema=schema,
            import_reference=import_reference,
            data_date=data_date,
            uploaded_file=uploaded_file,
            uploaded_by=request.user,
            status=DataImport.Status.PENDING,
            notes=request.data.get('notes', ''),
        )
        process_import(data_import)
        data_import.refresh_from_db()
        return Response(DataImportListSerializer(data_import).data, status=status.HTTP_201_CREATED)


class ImportDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def _get(self, pk):
        try:
            return DataImport.objects.select_related('schema', 'uploaded_by').get(pk=pk)
        except DataImport.DoesNotExist:
            return None

    def get(self, request, pk):
        obj = self._get(pk)
        if not obj:
            return Response(status=status.HTTP_404_NOT_FOUND)
        return Response(DataImportListSerializer(obj).data)

    def patch(self, request, pk):
        obj = self._get(pk)
        if not obj:
            return Response(status=status.HTTP_404_NOT_FOUND)
        # notes only
        if 'notes' in request.data:
            obj.notes = request.data['notes']
            obj.save(update_fields=['notes'])
        return Response(DataImportListSerializer(obj).data)


class ImportErrorListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        try:
            data_import = DataImport.objects.get(pk=pk)
        except DataImport.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)
        qs = data_import.errors.all()
        if request.query_params.get('field_name'):
            qs = qs.filter(field_name=request.query_params['field_name'])
        if request.query_params.get('error_type'):
            qs = qs.filter(error_type=request.query_params['error_type'])
        # Pagination: 100/page
        page = max(1, int(request.query_params.get('page', 1)))
        page_size = 100
        start = (page - 1) * page_size
        total = qs.count()
        results = qs[start:start + page_size]
        return Response({
            'count': total,
            'page': page,
            'page_size': page_size,
            'results': ImportValidationErrorSerializer(results, many=True).data,
        })


class ImportRecordListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        try:
            DataImport.objects.get(pk=pk)
        except DataImport.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)
        qs = PolicyRecord.objects.filter(data_import_id=pk)
        has_errors = request.query_params.get('has_errors')
        if has_errors == 'true':
            qs = qs.filter(has_errors=True)
        elif has_errors == 'false':
            qs = qs.filter(has_errors=False)
        page = max(1, int(request.query_params.get('page', 1)))
        page_size = 200
        start = (page - 1) * page_size
        total = qs.count()
        results = qs[start:start + page_size]
        return Response({
            'count': total,
            'page': page,
            'page_size': page_size,
            'results': PolicyRecordSerializer(results, many=True).data,
        })


class ImportRecordDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk, record_id):
        try:
            record = PolicyRecord.objects.get(pk=record_id, data_import_id=pk)
        except PolicyRecord.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)
        return Response(PolicyRecordSerializer(record).data)
