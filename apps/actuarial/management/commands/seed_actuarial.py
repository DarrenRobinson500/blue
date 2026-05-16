import io
import random
from datetime import date, timedelta
from decimal import Decimal

from django.core.files.uploadedfile import InMemoryUploadedFile
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

from apps.core.management.commands.seed_users import seed_users
from apps.actuarial.models import DataSchema, SchemaField, DataImport, PolicyRecord, ImportValidationError
from apps.actuarial.services.import_processor import process_import

User = get_user_model()


def _build_csv(headers, rows):
    lines = [','.join(headers)]
    for row in rows:
        lines.append(','.join(str(v) for v in row))
    return '\n'.join(lines) + '\n'


def _upload(schema, import_reference, data_date, csv_content, actuary, notes=''):
    file_bytes = csv_content.encode('utf-8')
    uploaded = InMemoryUploadedFile(
        file=io.BytesIO(file_bytes),
        field_name='uploaded_file',
        name=f'{import_reference}.csv',
        content_type='text/csv',
        size=len(file_bytes),
        charset='utf-8',
    )
    di = DataImport.objects.create(
        schema=schema,
        import_reference=import_reference,
        data_date=data_date,
        uploaded_file=uploaded,
        uploaded_by=actuary,
        status='pending',
        notes=notes,
    )
    process_import(di)
    return di


def seed_actuarial_data():
    seed_users()
    actuary = User.objects.filter(role='chief_actuary').first()
    rng = random.Random(42)

    # -----------------------------------------------------------------
    # Schema 1 — Term Life
    # -----------------------------------------------------------------
    tl01, created = DataSchema.objects.get_or_create(
        name='Term Life — Monthly Admin Extract',
        product_code='TL01',
        version=1,
        defaults={
            'description': 'Monthly administration system extract for the TL01 term life product.',
            'file_format': 'csv',
            'delimiter': ',',
            'has_header_row': True,
            'encoding': 'utf-8',
            'is_active': True,
            'created_by': actuary,
        }
    )
    if created:
        tl01_fields = [
            ('policy_number', 'Policy Number', 'string', True, True, None, None, 20, None, None),
            ('insured_dob', 'Date of Birth', 'date', True, False, '%d/%m/%Y', None, None, None, None),
            ('insured_gender', 'Gender', 'string', True, False, None, ['M', 'F', 'U'], None, None, None),
            ('policy_start_date', 'Policy Start Date', 'date', True, False, '%d/%m/%Y', None, None, None, None),
            ('sum_insured', 'Sum Insured ($)', 'decimal', True, False, None, None, None, Decimal('0'), Decimal('50000000')),
            ('premium_annual', 'Annual Premium ($)', 'decimal', True, False, None, None, None, Decimal('0'), None),
            ('smoker_status', 'Smoker Status', 'string', True, False, None, ['S', 'N', 'U'], None, None, None),
            ('policy_status', 'Policy Status', 'string', True, False, None, ['IF', 'LP', 'PU', 'SF', 'CN'], None, None, None),
            ('reinsurance_flag', 'Reinsurance Ceded', 'boolean', False, False, None, None, None, None, None),
            ('last_updated', 'Last Updated Date', 'date', False, False, '%d/%m/%Y', None, None, None, None),
        ]
        for i, (fn, dn, dt, req, pk, dfmt, av, ml, mn, mx) in enumerate(tl01_fields, 1):
            SchemaField.objects.create(
                schema=tl01, field_order=i, field_name=fn, display_name=dn,
                data_type=dt, is_required=req, is_primary_key=pk,
                date_format=dfmt or '', allowed_values=av, max_length=ml,
                min_value=mn, max_value=mx,
            )

    # -----------------------------------------------------------------
    # Schema 2 — Income Protection
    # -----------------------------------------------------------------
    ip01, created = DataSchema.objects.get_or_create(
        name='Income Protection — Monthly Admin Extract',
        product_code='IP01',
        version=1,
        defaults={
            'description': 'Monthly administration system extract for the IP01 income protection product.',
            'file_format': 'csv',
            'delimiter': ',',
            'has_header_row': True,
            'encoding': 'utf-8',
            'is_active': True,
            'created_by': actuary,
        }
    )
    if created:
        ip01_fields = [
            ('policy_number', 'Policy Number', 'string', True, True, None, None, 20, None, None),
            ('insured_dob', 'Date of Birth', 'date', True, False, '%d/%m/%Y', None, None, None, None),
            ('insured_gender', 'Gender', 'string', True, False, None, ['M', 'F', 'U'], None, None, None),
            ('policy_start_date', 'Policy Start Date', 'date', True, False, '%d/%m/%Y', None, None, None, None),
            ('benefit_monthly', 'Monthly Benefit ($)', 'decimal', True, False, None, None, None, Decimal('0'), Decimal('30000')),
            ('benefit_period', 'Benefit Period (years)', 'integer', True, False, None, [2, 5, 65], None, None, None),
            ('waiting_period_days', 'Waiting Period (days)', 'integer', True, False, None, [14, 30, 60, 90], None, None, None),
            ('occupation_class', 'Occupation Class', 'string', True, False, None, ['A', 'AA', 'B', 'C', 'D'], None, None, None),
            ('premium_annual', 'Annual Premium ($)', 'decimal', True, False, None, None, None, Decimal('0'), None),
            ('policy_status', 'Policy Status', 'string', True, False, None, ['IF', 'LP', 'PU', 'SF', 'CN'], None, None, None),
        ]
        for i, (fn, dn, dt, req, pk, dfmt, av, ml, mn, mx) in enumerate(ip01_fields, 1):
            SchemaField.objects.create(
                schema=ip01, field_order=i, field_name=fn, display_name=dn,
                data_type=dt, is_required=req, is_primary_key=pk,
                date_format=dfmt or '', allowed_values=av, max_length=ml,
                min_value=mn, max_value=mx,
            )

    # -----------------------------------------------------------------
    # Import 1 — TL01 / 2026-03-31 / 50 records / 2 errors
    # -----------------------------------------------------------------
    if not DataImport.objects.filter(import_reference='TL01-2026-03').exists():
        tl_headers = [
            'policy_number', 'insured_dob', 'insured_gender', 'policy_start_date',
            'sum_insured', 'premium_annual', 'smoker_status', 'policy_status',
            'reinsurance_flag', 'last_updated',
        ]
        tl_rows = []
        for i in range(1, 51):
            pid = f'P{100000 + i}'
            dob_year = rng.randint(1960, 1990)
            dob_month = rng.randint(1, 12)
            dob_day = rng.randint(1, 28)
            dob = f'{dob_day:02d}/{dob_month:02d}/{dob_year}'
            gender = rng.choice(['M', 'F'])
            start_year = rng.randint(2010, 2024)
            start = f'01/01/{start_year}'
            sum_ins = rng.randint(200, 2000) * 100
            prem = round(sum_ins * rng.uniform(0.003, 0.008), 2)
            smoker = rng.choice(['N', 'N', 'N', 'S', 'U'])
            reins = rng.choice(['true', 'false', ''])
            last_upd = f'31/03/2026'

            # Inject 2 specific errors on rows 5 and 12
            if i == 5:
                sum_ins = 60000000  # exceeds max of 50,000,000
            if i == 12:
                smoker = 'INVALID'  # not in allowed values

            tl_rows.append([pid, dob, gender, start, sum_ins, prem, smoker, 'IF', reins, last_upd])

        csv_content = _build_csv(tl_headers, tl_rows)
        _upload(tl01, 'TL01-2026-03', date(2026, 3, 31), csv_content, actuary,
                notes='March 2026 term life extract. 2 known data quality issues from admin system.')

    # -----------------------------------------------------------------
    # Import 2 — TL01 / 2026-04-30 / 52 records / 0 errors
    # -----------------------------------------------------------------
    if not DataImport.objects.filter(import_reference='TL01-2026-04').exists():
        tl_headers = [
            'policy_number', 'insured_dob', 'insured_gender', 'policy_start_date',
            'sum_insured', 'premium_annual', 'smoker_status', 'policy_status',
            'reinsurance_flag', 'last_updated',
        ]
        tl_rows = []
        for i in range(1, 53):
            pid = f'P{100000 + i}'
            dob_year = rng.randint(1960, 1992)
            dob_month = rng.randint(1, 12)
            dob_day = rng.randint(1, 28)
            dob = f'{dob_day:02d}/{dob_month:02d}/{dob_year}'
            gender = rng.choice(['M', 'F'])
            start_year = rng.randint(2010, 2025)
            start = f'01/01/{start_year}'
            sum_ins = rng.randint(200, 2000) * 100
            prem = round(sum_ins * rng.uniform(0.003, 0.008), 2)
            smoker = rng.choice(['N', 'N', 'N', 'S'])
            reins = rng.choice(['true', 'false', ''])
            last_upd = '30/04/2026'
            tl_rows.append([pid, dob, gender, start, sum_ins, prem, smoker, 'IF', reins, last_upd])

        csv_content = _build_csv(tl_headers, tl_rows)
        _upload(tl01, 'TL01-2026-04', date(2026, 4, 30), csv_content, actuary,
                notes='April 2026 term life extract. Clean file.')

    # -----------------------------------------------------------------
    # Import 3 — IP01 / 2026-04-30 / failed (missing column)
    # -----------------------------------------------------------------
    if not DataImport.objects.filter(import_reference='IP01-2026-04').exists():
        # Omit 'occupation_class' column — causes FILE-level failure
        bad_headers = [
            'policy_number', 'insured_dob', 'insured_gender', 'policy_start_date',
            'benefit_monthly', 'benefit_period', 'waiting_period_days',
            'premium_annual', 'policy_status',
        ]
        bad_rows = [['IP00001', '15/03/1985', 'M', '01/06/2018', '5000', '65', '30', '3600', 'IF']]
        csv_content = _build_csv(bad_headers, bad_rows)
        _upload(ip01, 'IP01-2026-04', date(2026, 4, 30), csv_content, actuary,
                notes='April 2026 IP extract — rejected due to missing occupation_class column.')


class Command(BaseCommand):
    help = 'Seed ActuarialCore data'

    def handle(self, *args, **kwargs):
        seed_actuarial_data()
        schemas = DataSchema.objects.count()
        imports = DataImport.objects.count()
        records = PolicyRecord.objects.count()
        errors = ImportValidationError.objects.count()
        self.stdout.write(self.style.SUCCESS(
            f'seed_actuarial complete: {schemas} schemas, {imports} imports, '
            f'{records} policy records, {errors} validation errors'
        ))
