from datetime import date, timedelta
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from apps.core.management.commands.seed_users import seed_users
from apps.risk.models import ObligationSource, Obligation, Control, ObligationControl, ObligationHistory

User = get_user_model()


def seed_risk_data():
    seed_users()
    cro = User.objects.filter(role='cro').first()

    # --- ObligationSources ---
    lia, _ = ObligationSource.objects.get_or_create(
        name='Life Insurance Act 1995',
        defaults={
            'source_type': 'legislation',
            'issuing_body': 'Parliament of Australia',
            'effective_date': date(1995, 7, 1),
        }
    )
    lps310, _ = ObligationSource.objects.get_or_create(
        name='LPS 310 Audit and Related Matters',
        defaults={
            'source_type': 'prudential_standard',
            'issuing_body': 'APRA',
            'effective_date': date(2013, 7, 1),
        }
    )
    lps110_current, _ = ObligationSource.objects.get_or_create(
        name='LPS 110 Capital Adequacy (2023)',
        defaults={
            'source_type': 'prudential_standard',
            'issuing_body': 'APRA',
            'effective_date': date(2023, 1, 1),
        }
    )
    life_code, _ = ObligationSource.objects.get_or_create(
        name='Life Insurance Code of Practice 2023',
        defaults={
            'source_type': 'life_code',
            'issuing_body': 'FSC',
            'effective_date': date(2023, 7, 1),
        }
    )
    lps110_old, _ = ObligationSource.objects.get_or_create(
        name='LPS 110 Capital Adequacy (2019)',
        defaults={
            'source_type': 'prudential_standard',
            'issuing_body': 'APRA',
            'effective_date': date(2019, 1, 1),
            'superseded_by': lps110_current,
        }
    )

    # --- Obligations ---
    o1, _ = Obligation.objects.get_or_create(
        reference='s48(1)(a) LIA',
        defaults={
            'source': lia,
            'verbatim_text': (
                'A life company must not carry on life insurance business in Australia unless '
                'the company holds a licence granted by APRA under this Division.'
            ),
            'interpretation': (
                'The company must maintain its APRA licence and comply with all conditions '
                'attached to it at all times. Any change to licence conditions requires '
                'board notification and legal review.'
            ),
            'owner': 'Chief Risk Officer',
            'implementation_notes': (
                'APRA licence reviewed annually at board strategy day. Licence conditions '
                'register maintained by compliance team and reviewed quarterly.'
            ),
            'risk_rating': 'critical',
            'status': 'active',
            'review_due': date.today() - timedelta(days=15),
        }
    )

    o2, _ = Obligation.objects.get_or_create(
        reference='s116(3) LIA',
        defaults={
            'source': lia,
            'verbatim_text': (
                'The assets of a statutory fund of a life company must only be applied for '
                'the purposes of the fund, and not for any other purpose.'
            ),
            'interpretation': (
                'Assets held in each statutory fund must be ringfenced and used exclusively '
                'for the benefit of policyholders in that fund. Intercompany transfers '
                'require APRA approval where applicable.'
            ),
            'owner': 'Chief Financial Officer',
            'implementation_notes': (
                'Fund segregation enforced via separate investment mandates and ledger '
                'accounts per fund. Treasury policy prohibits commingling.'
            ),
            'risk_rating': 'critical',
            'status': 'active',
            'review_due': date.today() + timedelta(days=45),
        }
    )

    o3, _ = Obligation.objects.get_or_create(
        reference='s16G LIA',
        defaults={
            'source': lia,
            'verbatim_text': (
                'A life company must, within 3 months after the end of each financial year, '
                'give APRA an annual return in the approved form.'
            ),
            'interpretation': (
                'The company must lodge its annual regulatory return with APRA within '
                '3 months of 31 December each year.'
            ),
            'owner': 'Head of Compliance',
            'implementation_notes': (
                'Annual return preparation schedule embedded in regulatory calendar. '
                'CFO and Appointed Actuary sign off before lodgement.'
            ),
            'risk_rating': 'high',
            'status': 'active',
            'review_due': date.today() + timedelta(days=90),
        }
    )

    o4, _ = Obligation.objects.get_or_create(
        reference='LPS 310 — Para 12',
        defaults={
            'source': lps310,
            'verbatim_text': (
                'A life company must have an internal audit function. The internal audit function '
                'must be independent of the business lines it audits.'
            ),
            'interpretation': (
                'The company must maintain a functionally independent internal audit function '
                'with a direct reporting line to the Audit and Risk Committee of the board.'
            ),
            'owner': 'Chief Risk Officer',
            'implementation_notes': (
                'Internal audit function established and reports to ARC. Audit charter '
                'approved by board. Annual audit plan presented to ARC at February meeting.'
            ),
            'risk_rating': 'high',
            'status': 'active',
            'review_due': date.today() + timedelta(days=120),
        }
    )

    o5, _ = Obligation.objects.get_or_create(
        reference='LPS 310 — Para 23',
        defaults={
            'source': lps310,
            'verbatim_text': (
                'A life company must appoint a suitably qualified and experienced external auditor '
                'to conduct an annual audit of its financial statements.'
            ),
            'interpretation': (
                'The external auditor must be a registered company auditor who meets APRA\'s '
                'independence and rotation requirements.'
            ),
            'owner': 'Chief Financial Officer',
            'implementation_notes': (
                'External auditor appointed by board, reviewed for independence annually. '
                'Lead partner rotation every 5 years per independence requirements.'
            ),
            'risk_rating': 'medium',
            'status': 'active',
            'review_due': date.today() + timedelta(days=180),
        }
    )

    o6, _ = Obligation.objects.get_or_create(
        reference='LPS 310 — Para 31',
        defaults={
            'source': lps310,
            'verbatim_text': (
                'The auditor of a life company must report directly to the Board or the Audit '
                'Committee of the Board on any significant deficiency identified during the audit.'
            ),
            'interpretation': (
                'Any material control deficiency or significant audit finding must be escalated '
                'directly to the Audit and Risk Committee, not filtered through management.'
            ),
            'owner': 'Chief Risk Officer',
            'implementation_notes': (
                'ARC terms of reference include direct auditor access. Auditor presents '
                'findings in-camera session at ARC without management present.'
            ),
            'risk_rating': 'high',
            'status': 'active',
            'review_due': date.today() + timedelta(days=150),
        }
    )

    o7, _ = Obligation.objects.get_or_create(
        reference='LPS 110 — Para 16',
        defaults={
            'source': lps110_current,
            'verbatim_text': (
                'A life company must at all times hold Eligible Capital of at least the Prescribed '
                'Capital Amount for each statutory fund.'
            ),
            'interpretation': (
                'The company must hold capital above the PCA for each statutory fund at all times, '
                'not just at reporting dates. Breach requires immediate notification to APRA.'
            ),
            'owner': 'Chief Actuary',
            'implementation_notes': (
                'Monthly capital adequacy calculations performed by Appointed Actuary. '
                'Board capital dashboard updated monthly. Trigger levels set at 110% of PCA '
                'for management action and 105% for board escalation.'
            ),
            'risk_rating': 'critical',
            'status': 'active',
            'review_due': date.today() + timedelta(days=30),
        }
    )

    o8, _ = Obligation.objects.get_or_create(
        reference='LPS 110 — Para 34',
        defaults={
            'source': lps110_current,
            'verbatim_text': (
                'A life company must notify APRA as soon as practicable, and in any event within '
                '3 business days, if the company becomes aware that it may breach its capital requirement.'
            ),
            'interpretation': (
                'Any indication that capital may fall below PCA must trigger immediate notification '
                'to APRA within 3 business days. "Aware" includes management projections '
                'indicating a likely future breach.'
            ),
            'owner': 'Chief Risk Officer',
            'implementation_notes': (
                'Capital breach notification procedure in Capital Management Policy. '
                'CFO, Appointed Actuary and CRO in notification chain. Board to be briefed same day.'
            ),
            'risk_rating': 'critical',
            'status': 'active',
            'review_due': date.today() + timedelta(days=60),
        }
    )

    o9, _ = Obligation.objects.get_or_create(
        reference='LPS 110 — Para 52',
        defaults={
            'source': lps110_current,
            'verbatim_text': (
                'A life company must conduct an Internal Capital Adequacy Assessment Process (ICAAP) '
                'at least annually and submit the results to APRA.'
            ),
            'interpretation': (
                'The company must complete a comprehensive ICAAP that identifies and quantifies '
                'all material risks, including those not fully captured in the PCA calculation.'
            ),
            'owner': 'Chief Actuary',
            'implementation_notes': (
                'ICAAP conducted annually in Q3. Draft reviewed by ALCO and Risk Committee '
                'before board approval. Submitted to APRA by 30 September each year.'
            ),
            'risk_rating': 'high',
            'status': 'active',
            'review_due': date.today() + timedelta(days=200),
        }
    )

    o10, _ = Obligation.objects.get_or_create(
        reference='Code — s3.1',
        defaults={
            'source': life_code,
            'verbatim_text': (
                'We will provide you with clear, honest and timely information to help you make '
                'informed decisions about your life insurance.'
            ),
            'interpretation': (
                'All policyholder communications must be clear, accurate and provided in a timely '
                'manner. Marketing materials must not be misleading. PDS must be up to date.'
            ),
            'owner': 'Chief Operating Officer',
            'implementation_notes': (
                'PDS review cycle embedded in product governance framework. '
                'Plain-language review panel reviews all new customer communications.'
            ),
            'risk_rating': 'medium',
            'status': 'active',
            'review_due': date.today() + timedelta(days=110),
        }
    )

    o11, _ = Obligation.objects.get_or_create(
        reference='Code — s7.2',
        defaults={
            'source': life_code,
            'verbatim_text': (
                'We will acknowledge receipt of a complaint within 5 business days of receiving it '
                'and keep you informed of the progress of your complaint.'
            ),
            'interpretation': (
                'All written and verbal complaints must be acknowledged within 5 business days. '
                'Status updates required for complaints not resolved within 30 days.'
            ),
            'owner': 'Chief Operating Officer',
            'implementation_notes': (
                'CRM system triggers 5-day acknowledgement workflow. '
                'Complaints dashboard monitored daily by Customer Resolutions team.'
            ),
            'risk_rating': 'medium',
            'status': 'active',
            'review_due': date.today() + timedelta(days=90),
        }
    )

    o12, _ = Obligation.objects.get_or_create(
        reference='Code — s12.1',
        defaults={
            'source': life_code,
            'verbatim_text': (
                'We will not use information about a pre-existing condition to deny or limit '
                'a claim where the condition was not material to the risk at time of application.'
            ),
            'interpretation': (
                'Claims decisions involving pre-existing conditions must demonstrate that the '
                'condition was material to the original underwriting risk assessment. '
                'Independent medical review required for declined claims citing pre-existing conditions.'
            ),
            'owner': 'Head of Claims',
            'implementation_notes': (
                'Pre-existing condition framework embedded in claims guidelines. '
                'All PEC declines reviewed by CMO before issuing. Quarterly audit of PEC decisions.'
            ),
            'risk_rating': 'high',
            'status': 'active',
            'review_due': date.today() + timedelta(days=75),
        }
    )

    obligations = [o1, o2, o3, o4, o5, o6, o7, o8, o9, o10, o11, o12]

    # --- Controls ---
    c1, _ = Control.objects.get_or_create(
        name='Monthly Capital Adequacy Report',
        defaults={
            'description': (
                'Appointed Actuary produces monthly capital adequacy calculation for each statutory '
                'fund. Results reviewed by CFO and CRO before presentation to board.'
            ),
            'control_type': 'detective',
            'frequency': 'monthly',
            'owner': 'Chief Actuary',
            'evidence_description': 'Monthly capital report signed by Appointed Actuary and CFO. Board papers.',
            'status': 'operating',
        }
    )

    c2, _ = Control.objects.get_or_create(
        name='APRA Licence Conditions Register',
        defaults={
            'description': (
                'Compliance team maintains a register of all APRA licence conditions. '
                'Register reviewed quarterly and after any regulatory correspondence.'
            ),
            'control_type': 'preventive',
            'frequency': 'quarterly',
            'owner': 'Head of Compliance',
            'evidence_description': 'Signed quarterly attestation from Head of Compliance. Register version history.',
            'status': 'operating',
        }
    )

    c3, _ = Control.objects.get_or_create(
        name='Statutory Fund Segregation Controls',
        defaults={
            'description': (
                'Treasury management system enforces fund segregation via separate ledger accounts, '
                'investment mandates and custody accounts per statutory fund.'
            ),
            'control_type': 'preventive',
            'frequency': 'continuous',
            'owner': 'Chief Financial Officer',
            'evidence_description': 'Treasury system configuration evidence. Annual external audit sign-off.',
            'status': 'operating',
        }
    )

    c4, _ = Control.objects.get_or_create(
        name='Internal Audit Charter and Annual Plan',
        defaults={
            'description': (
                'Board-approved internal audit charter establishes independence, authority and '
                'scope. Annual audit plan approved by ARC at February meeting.'
            ),
            'control_type': 'preventive',
            'frequency': 'annual',
            'owner': 'Chief Risk Officer',
            'evidence_description': 'Board-approved IA charter. ARC-approved annual audit plan. ARC minutes.',
            'status': 'operating',
        }
    )

    c5, _ = Control.objects.get_or_create(
        name='Capital Breach Notification Procedure',
        defaults={
            'description': (
                'Documented procedure triggered when capital falls below or is projected to fall '
                'below PCA trigger levels. Includes APRA notification within 3 business days.'
            ),
            'control_type': 'corrective',
            'frequency': 'ad_hoc',
            'owner': 'Chief Risk Officer',
            'evidence_description': 'Capital Management Policy — breach notification section. Drill test records.',
            'status': 'not_operating',
        }
    )

    c6, _ = Control.objects.get_or_create(
        name='Annual Regulatory Return Preparation',
        defaults={
            'description': (
                'Structured preparation process for APRA annual return, including data collection, '
                'CFO sign-off and Appointed Actuary certification before lodgement.'
            ),
            'control_type': 'preventive',
            'frequency': 'annual',
            'owner': 'Head of Compliance',
            'evidence_description': 'APRA lodgement receipt. CFO and AA sign-off documentation.',
            'status': 'operating',
        }
    )

    c7, _ = Control.objects.get_or_create(
        name='Complaint Acknowledgement Workflow',
        defaults={
            'description': (
                'CRM system triggers automated 5-business-day acknowledgement for all complaints '
                'received via any channel. Escalation alert if acknowledgement not sent.'
            ),
            'control_type': 'preventive',
            'frequency': 'continuous',
            'owner': 'Chief Operating Officer',
            'evidence_description': 'CRM workflow configuration. Weekly complaints dashboard extract.',
            'status': 'operating',
        }
    )

    c8, _ = Control.objects.get_or_create(
        name='Pre-Existing Condition Claims Audit',
        defaults={
            'description': (
                'Quarterly audit of all claims declined citing pre-existing conditions. '
                'Sample reviewed by CMO and external medical reviewer for consistency.'
            ),
            'control_type': 'detective',
            'frequency': 'quarterly',
            'owner': 'Head of Claims',
            'evidence_description': 'Quarterly audit report signed by CMO. External reviewer sign-off.',
            'status': 'operating',
        }
    )

    controls = [c1, c2, c3, c4, c5, c6, c7, c8]

    # --- Link controls to obligations ---
    links = [
        (o1, c2),   # Licence obligation → licence register control
        (o2, c3),   # Statutory fund obligation → fund segregation control
        (o3, c6),   # Annual return → annual return preparation
        (o4, c4),   # IA independence → IA charter
        (o5, c4),   # External auditor → IA charter (shared governance control)
        (o7, c1),   # Capital adequacy → monthly capital report
        (o7, c5),   # Capital adequacy → breach notification
        (o8, c1),   # APRA notification → monthly capital report (early warning)
        (o8, c5),   # APRA notification → breach notification procedure
        (o11, c7),  # Complaint acknowledgement → CRM workflow
        (o12, c8),  # PEC claims → PEC audit
    ]

    for obligation, control in links:
        ObligationControl.objects.get_or_create(
            obligation=obligation,
            control=control,
            defaults={'linked_by': cro},
        )

    # --- ObligationHistory ---
    if not ObligationHistory.objects.filter(obligation=o7).exists():
        ObligationHistory.objects.create(
            obligation=o7,
            changed_by=cro,
            snapshot={
                'reference': 'LPS 110 — Para 16',
                'risk_rating': 'high',
                'owner': 'Chief Financial Officer',
                'status': 'active',
                'review_due': str(date.today() + timedelta(days=90)),
                'updated_at': '2026-01-15T09:30:00+11:00',
            },
            change_summary='Risk rating upgraded from high to critical following ICAAP stress test results. Owner changed from CFO to Chief Actuary.',
        )
        ObligationHistory.objects.create(
            obligation=o7,
            changed_by=cro,
            snapshot={
                'reference': 'LPS 110 — Para 16',
                'risk_rating': 'high',
                'owner': 'Chief Risk Officer',
                'status': 'active',
                'review_due': str(date.today() + timedelta(days=120)),
                'updated_at': '2025-10-01T14:00:00+11:00',
            },
            change_summary='Owner updated from CRO to CFO. Implementation notes expanded to include trigger levels.',
        )
        ObligationHistory.objects.create(
            obligation=o1,
            changed_by=cro,
            snapshot={
                'reference': 's48(1)(a) LIA',
                'risk_rating': 'critical',
                'owner': 'Head of Compliance',
                'status': 'active',
                'review_due': str(date.today() - timedelta(days=60)),
                'updated_at': '2025-07-10T11:00:00+10:00',
            },
            change_summary='Owner transferred from Head of Compliance to CRO following organisational restructure.',
        )


class Command(BaseCommand):
    help = 'Seed RiskCore data'

    def handle(self, *args, **kwargs):
        seed_risk_data()
        from apps.risk.models import ObligationSource, Obligation, Control, ObligationHistory
        self.stdout.write(self.style.SUCCESS(
            f'seed_risk complete: '
            f'{ObligationSource.objects.count()} sources, '
            f'{Obligation.objects.count()} obligations, '
            f'{Control.objects.count()} controls, '
            f'{ObligationHistory.objects.count()} history entries'
        ))
