from datetime import date, timedelta
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

from apps.core.models import Function
from apps.risk.models import Obligation, Control
from apps.risks.models import (
    RiskCategory, MatrixCell, Risk, RiskAssessment,
    RiskControl, RiskTreatment, RiskHistory, RATING_ORDER,
)

User = get_user_model()

# The consequence-weighted default matrix:
# Consequence →    1        2        3        4        5
# Likelihood 1   low      low      low      medium   high
# Likelihood 2   low      low      medium   high     high
# Likelihood 3   low      medium   medium   high     critical
# Likelihood 4   medium   medium   high     critical critical
# Likelihood 5   medium   high     high     critical critical
DEFAULT_MATRIX = {
    (1, 1): 'low',    (1, 2): 'low',    (1, 3): 'low',      (1, 4): 'medium',   (1, 5): 'high',
    (2, 1): 'low',    (2, 2): 'low',    (2, 3): 'medium',   (2, 4): 'high',     (2, 5): 'high',
    (3, 1): 'low',    (3, 2): 'medium', (3, 3): 'medium',   (3, 4): 'high',     (3, 5): 'critical',
    (4, 1): 'medium', (4, 2): 'medium', (4, 3): 'high',     (4, 4): 'critical', (4, 5): 'critical',
    (5, 1): 'medium', (5, 2): 'high',   (5, 3): 'high',     (5, 4): 'critical', (5, 5): 'critical',
}


def resolve_rating(l, c):
    try:
        return MatrixCell.objects.get(likelihood=l, consequence=c).rating
    except MatrixCell.DoesNotExist:
        return DEFAULT_MATRIX.get((l, c), 'low')


def within_appetite(rating, appetite):
    return RATING_ORDER.get(rating, 99) <= RATING_ORDER.get(appetite, 0)


class Command(BaseCommand):
    help = 'Seed risk register data — run after seed_risk'

    def handle(self, *args, **kwargs):
        cro_user = User.objects.filter(role='cro').first()
        actuary_user = User.objects.filter(role='chief_actuary').first()
        admin_user = User.objects.filter(role='admin').first()

        if not cro_user:
            self.stdout.write(self.style.ERROR('No CRO user found. Run seed_users first.'))
            return

        # Functions used as risk owners
        fn_cro = Function.objects.filter(code='CRO').first()
        fn_actuary = Function.objects.filter(code='CHIEF_ACT').first()
        fn_cfo = Function.objects.filter(code='CFO').first()
        cro = cro_user  # keep alias for treatment owners and assessed_by

        # ── Matrix cells ──────────────────────────────────────────────────────
        for (l, c), rating in DEFAULT_MATRIX.items():
            MatrixCell.objects.get_or_create(likelihood=l, consequence=c, defaults={'rating': rating})
        self.stdout.write('Matrix cells: OK')

        # ── Risk categories ───────────────────────────────────────────────────
        cat_data = [
            {
                'name': 'Insurance Risk',
                'appetite': 'medium',
                'description': 'Risks arising from the underwriting, pricing, reserving, and claims settlement of life and disability insurance products.',
                'appetite_rationale': 'Insurance risk is inherent to our business model and cannot be eliminated. The Board accepts medium appetite reflecting our capability to manage it through disciplined underwriting and reinsurance.',
            },
            {
                'name': 'Financial Risk',
                'appetite': 'medium',
                'description': 'Risks related to asset-liability mismatches, investment performance, liquidity, and the capital adequacy of the organisation.',
                'appetite_rationale': 'Financial risks are managed through conservative investment mandates and robust capital management. Medium appetite reflects the need to generate investment returns while protecting policyholder obligations.',
            },
            {
                'name': 'Operational Risk',
                'appetite': 'low',
                'description': 'Risks arising from inadequate or failed internal processes, people, systems, or from external events including cyber threats and business continuity events.',
                'appetite_rationale': 'Operational failures directly harm policyholders and regulators. The Board has zero tolerance for systemic operational failures and sets a low appetite to drive investment in controls.',
            },
            {
                'name': 'Regulatory & Compliance Risk',
                'appetite': 'low',
                'description': 'Risks arising from failure to comply with laws, regulations, APRA prudential standards, ASIC requirements, and the Life Insurance Code of Practice.',
                'appetite_rationale': 'Regulatory breaches carry severe financial and reputational consequences and may threaten our APRA licence. The Board sets the lowest possible appetite for this category.',
            },
            {
                'name': 'Strategic Risk',
                'appetite': 'high',
                'description': 'Risks that arise from decisions about our business model, strategy, market positioning, and competitive environment.',
                'appetite_rationale': 'Strategic risk is accepted as part of pursuing growth and delivering on our long-term strategy. The Board is willing to accept higher strategic risk in exchange for competitive advantage.',
            },
            {
                'name': 'Emerging Risk',
                'appetite': 'medium',
                'description': 'Risks that are newly developing or not yet fully understood, including climate change, technological disruption, and evolving societal expectations.',
                'appetite_rationale': 'Emerging risks require active monitoring and proportionate response. Medium appetite allows us to invest in emerging capabilities while not overcommitting to uncertain exposures.',
            },
        ]
        categories = {}
        for d in cat_data:
            cat, _ = RiskCategory.objects.get_or_create(name=d['name'], defaults=d)
            categories[d['name']] = cat
        self.stdout.write('Categories: OK')

        # ── Risks ─────────────────────────────────────────────────────────────
        risks_data = [
            # Insurance Risk — 2
            {
                'title': 'Capital inadequacy under stress',
                'description': (
                    'A severe adverse scenario — mass lapse, pandemic, or extreme weather event — '
                    'causes policyholder claims to exceed reserves, impairing our ability to meet '
                    'obligations and satisfy the APRA Prescribed Capital Amount for one or more statutory funds.'
                ),
                'category': 'Insurance Risk',
                'source_type': 'regulatory',
                'owner': fn_actuary,
                'status': 'active',
                'velocity': 'high',
                'notes': 'Monitored monthly by Appointed Actuary. Linked to ICAAP.',
                'stale': True,
                'il': 2, 'ic': 5, 'rl': 2, 'rc': 4, 'tl': 1, 'tc': 3,
                'confidence': 'high',
                'rationale': (
                    'Inherent likelihood assessed at 2 (unlikely but plausible under a 1-in-50 stress scenario). '
                    'Inherent consequence 5 (would be catastrophic — regulatory breach, forced restructuring). '
                    'Existing controls (monthly capital report, breach notification procedure) reduce residual '
                    'likelihood to 2 but consequence remains high at 4 because the financial impact of a capital '
                    'breach cannot be fully mitigated by reporting controls alone. '
                    'Target position assumes completion of ICAAP enhancement and dynamic capital buffer policy.'
                ),
                'lps_obligations': ['LPS 110 — Para 16', 'LPS 110 — Para 34', 'LPS 110 — Para 52'],
            },
            {
                'title': 'Mass lapse event in term life portfolio',
                'description': (
                    'A period of economic stress or significant premium increase causes policyholders to '
                    'lapse policies en masse, creating a sudden and material reduction in premium income '
                    'and adversely affecting reserving assumptions.'
                ),
                'category': 'Insurance Risk',
                'source_type': 'financial',
                'owner': fn_actuary,
                'status': 'active',
                'velocity': 'medium',
                'notes': '',
                'stale': False,
                'il': 3, 'ic': 4, 'rl': 2, 'rc': 3, 'tl': 1, 'tc': 2,
                'confidence': 'medium',
                'rationale': (
                    'Mass lapse scenarios are plausible (likelihood 3) given current inflationary pressures on '
                    'household budgets. Consequence rated 4 due to the reserve and earnings impact of '
                    'significant portfolio run-off. Controls include repricing framework and policyholder '
                    'retention programs, reducing residual to L2/C3. Target assumes enhanced lapse early '
                    'warning dashboard implementation.'
                ),
                'lps_obligations': [],
            },
            # Financial Risk — 2
            {
                'title': 'Reinsurer concentration risk',
                'description': (
                    'Our catastrophe reinsurance program is heavily concentrated in two reinsurers. '
                    'Failure or withdrawal of either counterparty could leave the company exposed to '
                    'catastrophe losses without adequate reinsurance recovery.'
                ),
                'category': 'Financial Risk',
                'source_type': 'financial',
                'owner': fn_actuary,
                'status': 'active',
                'velocity': 'high',
                'notes': 'Reinsurer panel reviewed annually at contract renewal.',
                'stale': False,
                'il': 2, 'ic': 4, 'rl': 2, 'rc': 3, 'tl': 1, 'tc': 2,
                'confidence': 'medium',
                'rationale': (
                    'Both reinsurers are A-rated and financially strong (inherent L2). Consequence is high (4) '
                    'because loss of either would require immediate capital injection or program restructuring. '
                    'Concentration is partially mitigated by treaty review and counterparty limits policy, '
                    'reducing residual to L2/C3. Target requires diversification to a third reinsurer panel member.'
                ),
                'lps_obligations': [],
            },
            {
                'title': 'Interest rate mismatch risk',
                'description': (
                    'Duration mismatch between our life insurance liabilities (long-dated) and the '
                    'fixed income assets backing them creates exposure to interest rate movements that '
                    'could erode our net asset position.'
                ),
                'category': 'Financial Risk',
                'source_type': 'financial',
                'owner': fn_cro,
                'status': 'active',
                'velocity': 'medium',
                'notes': '',
                'stale': False,
                'il': 3, 'ic': 3, 'rl': 2, 'rc': 3, 'tl': 1, 'tc': 2,
                'confidence': 'high',
                'rationale': (
                    'Interest rate sensitivity is inherent and moderate-high (L3/C3 = medium-high). '
                    'ALM program and quarterly ALCO review reduce exposure materially. Residual '
                    'assessed at L2/C3 reflecting the active hedging program. Target position assumes '
                    'extension of duration matching program across all statutory funds.'
                ),
                'lps_obligations': [],
            },
            # Operational Risk — 2
            {
                'title': 'Key person dependency — Appointed Actuary',
                'description': (
                    'The company is heavily dependent on the Appointed Actuary for valuation, capital '
                    'reporting, ICAAP, and regulatory submissions. Sudden departure without a pipeline '
                    'successor would materially impair regulatory compliance and board reporting capability.'
                ),
                'category': 'Operational Risk',
                'source_type': 'operational',
                'owner': fn_cro,
                'status': 'active',
                'velocity': 'high',
                'notes': 'Succession planning discussed at March People Committee. No formal successor identified.',
                'stale': True,
                'il': 3, 'ic': 4, 'rl': 3, 'rc': 3, 'tl': 2, 'tc': 2,
                'confidence': 'medium',
                'rationale': (
                    'Key person dependency is high likelihood (3) given our current single-actuary model. '
                    'Consequence is significant (4) because APRA requires a licenced Appointed Actuary and '
                    'replacement typically takes 6–12 months. No formal succession plan currently in place '
                    'means controls do not materially reduce residual (L3/C3). Assessment flagged as stale — '
                    'capital breach notification control is not operating which affects our risk posture.'
                ),
                'lps_obligations': [],
            },
            {
                'title': 'AI model failure in underwriting',
                'description': (
                    'The underwriting decision support tool uses an ML model for risk scoring. '
                    'Model drift, training data bias, or adversarial manipulation could cause '
                    'systematic mispricing or discriminatory outcomes, creating financial loss and '
                    'regulatory exposure.'
                ),
                'category': 'Operational Risk',
                'source_type': 'operational',
                'owner': fn_cfo or fn_cro,
                'status': 'active',
                'velocity': 'medium',
                'notes': 'Model governance framework being developed. Currently no formal model risk policy.',
                'stale': False,
                'il': 3, 'ic': 3, 'rl': 3, 'rc': 2, 'tl': 2, 'tc': 2,
                'confidence': 'low',
                'rationale': (
                    'AI/ML model risk is an emerging operational risk area (L3). Consequence is moderate (3) — '
                    'financial loss from mispricing plus reputational damage. We have limited controls at present '
                    '(no formal model governance) and confidence in the assessment is low due to the novelty of '
                    'the risk. Residual L3/C2 reflects partial mitigation from manual underwriting override process. '
                    'Target position requires model governance framework implementation.'
                ),
                'lps_obligations': [],
            },
            # Regulatory & Compliance Risk — 2
            {
                'title': 'Adverse regulatory change — APRA capital standards',
                'description': (
                    'APRA revises LPS 110 capital adequacy standards in a way that materially '
                    'increases our Prescribed Capital Amount, requiring additional capital issuance '
                    'or material changes to our investment strategy.'
                ),
                'category': 'Regulatory & Compliance Risk',
                'source_type': 'regulatory',
                'owner': fn_cro,
                'status': 'active',
                'velocity': 'medium',
                'notes': 'APRA has signalled a review of life insurance capital standards in their published roadmap.',
                'stale': False,
                'il': 3, 'ic': 4, 'rl': 3, 'rc': 3, 'tl': 2, 'tc': 2,
                'confidence': 'medium',
                'rationale': (
                    'APRA regulatory change risk is assessed as moderate likelihood (3) given signalled '
                    'regulatory agenda. Consequence is high (4) as capital standard changes may require '
                    'additional equity issuance. Regulatory engagement and industry submissions partially '
                    'mitigate but cannot prevent adverse outcomes. Residual L3/C3 reflects limited control '
                    'efficacy. Target requires capital buffer strategy and proactive regulatory engagement program.'
                ),
                'lps_obligations': ['LPS 110 — Para 16'],
            },
            # Strategic Risk — 1 active
            {
                'title': 'New product launch failure',
                'description': (
                    'A new insurance product fails to achieve target premium volumes in year one '
                    'due to pricing miscalibration, distribution weakness, or adverse market reception, '
                    'resulting in stranded development costs and reputational damage.'
                ),
                'category': 'Strategic Risk',
                'source_type': 'strategic',
                'owner': fn_cfo or fn_cro,
                'status': 'active',
                'velocity': 'low',
                'notes': 'IP01 product launch scheduled for Q4. Pilot distribution trial underway.',
                'stale': False,
                'il': 3, 'ic': 3, 'rl': 2, 'rc': 2, 'tl': 1, 'tc': 2,
                'confidence': 'medium',
                'rationale': (
                    'Product launch failure is a common strategic risk (inherent L3/C3 = medium). '
                    'Our product governance framework, go-to-market plan review and pilot distribution '
                    'program reduce residual to L2/C2. Confidence is medium as pilot data is still '
                    'being collected. Target position assumes successful pilot completion and distribution '
                    'partner onboarding.'
                ),
                'lps_obligations': [],
            },
            # Draft risks
            {
                'title': 'Breach of LPS 310 audit independence requirements',
                'description': (
                    'Inadequate management of external auditor independence or internal audit '
                    'conflicts could result in an APRA finding of non-compliance with LPS 310 '
                    'audit independence requirements.'
                ),
                'category': 'Regulatory & Compliance Risk',
                'source_type': 'regulatory',
                'owner': fn_actuary,
                'status': 'draft',
                'velocity': 'medium',
                'notes': 'Identified following external audit partner rotation. Requires assessment.',
                'stale': False,
                'il': None, 'ic': None, 'rl': None, 'rc': None, 'tl': None, 'tc': None,
                'confidence': None,
                'rationale': None,
                'lps_obligations': ['LPS 310 — Para 12', 'LPS 310 — Para 23', 'LPS 310 — Para 31'],
            },
            {
                'title': 'Talent acquisition gap in actuarial function',
                'description': (
                    'Difficulty attracting and retaining qualified actuaries creates a capability '
                    'gap that limits our ability to support product development, regulatory submissions, '
                    'and ICAAP in a timely manner.'
                ),
                'category': 'Strategic Risk',
                'source_type': 'strategic',
                'owner': fn_cro,
                'status': 'draft',
                'velocity': 'low',
                'notes': 'Two actuarial vacancies open for >4 months.',
                'stale': False,
                'il': None, 'ic': None, 'rl': None, 'rc': None, 'tl': None, 'tc': None,
                'confidence': None,
                'rationale': None,
                'lps_obligations': [],
            },
            {
                'title': 'Digital distribution partner dependency',
                'description': (
                    'Our growth strategy relies heavily on a single digital aggregator for new business. '
                    'Changes to the aggregator\'s commercial terms, market exit, or ASIC action against '
                    'them could materially impair our distribution capability.'
                ),
                'category': 'Strategic Risk',
                'source_type': 'strategic',
                'owner': fn_cfo or fn_cro,
                'status': 'draft',
                'velocity': 'medium',
                'notes': '',
                'stale': False,
                'il': None, 'ic': None, 'rl': None, 'rc': None, 'tl': None, 'tc': None,
                'confidence': None,
                'rationale': None,
                'lps_obligations': [],
            },
            # Closed
            {
                'title': 'Cyber attack on policyholder data platform',
                'description': (
                    'A ransomware or data exfiltration attack targeting our policyholder data platform '
                    'could expose sensitive health and financial data, trigger the Notifiable Data Breach '
                    'scheme, and result in class action exposure.'
                ),
                'category': 'Emerging Risk',
                'source_type': 'operational',
                'owner': fn_cfo or fn_cro,
                'status': 'closed',
                'velocity': 'high',
                'notes': 'Closed following completion of platform migration to hardened cloud environment. Residual risk transferred to new "Cloud platform security" risk register entry (pending).',
                'stale': False,
                'il': None, 'ic': None, 'rl': None, 'rc': None, 'tl': None, 'tc': None,
                'confidence': None,
                'rationale': None,
                'lps_obligations': [],
            },
        ]

        risk_objs = {}
        for d in risks_data:
            defaults = {
                'description': d['description'],
                'category': categories[d['category']],
                'source_type': d['source_type'],
                'owner': d['owner'],
                'status': d['status'],
                'velocity': d['velocity'],
                'notes': d['notes'],
                'assessment_stale': d['stale'],
                'created_by': cro,
            }
            risk, _ = Risk.objects.get_or_create(title=d['title'], defaults=defaults)
            risk_objs[d['title']] = risk

            # Link obligations
            for ref in d.get('lps_obligations', []):
                try:
                    obl = Obligation.objects.get(reference=ref)
                    risk.linked_obligations.add(obl)
                except Obligation.DoesNotExist:
                    pass

            # Create assessment for active risks
            if d['status'] == 'active' and d['il'] is not None:
                if not risk.assessments.exists():
                    inherent_rating = resolve_rating(d['il'], d['ic'])
                    residual_rating = resolve_rating(d['rl'], d['rc'])
                    target_rating = resolve_rating(d['tl'], d['tc'])
                    appetite = categories[d['category']].appetite
                    RiskAssessment.objects.create(
                        risk=risk,
                        inherent_likelihood=d['il'],
                        inherent_consequence=d['ic'],
                        inherent_rating=inherent_rating,
                        residual_likelihood=d['rl'],
                        residual_consequence=d['rc'],
                        residual_rating=residual_rating,
                        target_likelihood=d['tl'],
                        target_consequence=d['tc'],
                        target_rating=target_rating,
                        within_appetite=within_appetite(residual_rating, appetite),
                        confidence=d['confidence'],
                        rationale=d['rationale'],
                        assessed_by=cro,
                        is_current=True,
                    )

        self.stdout.write('Risks + assessments: OK')

        # ── Risk controls ─────────────────────────────────────────────────────
        try:
            c1 = Control.objects.get(name='Monthly Capital Adequacy Report')
            c2 = Control.objects.get(name='APRA Licence Conditions Register')
            c4 = Control.objects.get(name='Internal Audit Charter and Annual Plan')
            c5 = Control.objects.get(name='Capital Breach Notification Procedure')
            c6 = Control.objects.get(name='Annual Regulatory Return Preparation')

            control_links = [
                (
                    'Capital inadequacy under stress', c1, 'detective', 'strong',
                    'Monthly capital report provides early warning of capital deterioration against PCA triggers.',
                ),
                (
                    'Capital inadequacy under stress', c5, 'corrective', 'weak',
                    'Breach notification procedure should activate when capital approaches PCA. Currently not operating — a key gap in our control environment.',
                ),
                (
                    'Mass lapse event in term life portfolio', c1, 'detective', 'adequate',
                    'Monthly capital report includes lapse sensitivity analysis which would flag early indicators of mass lapse.',
                ),
                (
                    'Adverse regulatory change — APRA capital standards', c6, 'detective', 'adequate',
                    'Annual return preparation process ensures we remain current with APRA requirements and surfaces regulatory changes early.',
                ),
                (
                    'Key person dependency — Appointed Actuary', c4, 'preventive', 'weak',
                    'Internal audit charter includes coverage of key person risk in the actuarial function. However, the control does not address succession — it only identifies the gap.',
                ),
                (
                    'Breach of LPS 310 audit independence requirements', c4, 'preventive', 'strong',
                    'IA charter establishes independence requirements and ARC oversight of the audit function.',
                ),
                (
                    'Reinsurer concentration risk', c2, 'detective', 'adequate',
                    'Licence conditions register includes reinsurance counterparty requirements, prompting annual review.',
                ),
            ]

            for title, control, role, effectiveness, notes in control_links:
                risk = risk_objs.get(title)
                if risk:
                    RiskControl.objects.get_or_create(
                        risk=risk,
                        control=control,
                        defaults={
                            'control_role': role,
                            'effectiveness': effectiveness,
                            'linkage_notes': notes,
                            'added_by': cro,
                        }
                    )
            self.stdout.write('Risk controls: OK')
        except Control.DoesNotExist:
            self.stdout.write(self.style.WARNING('Some controls not found. Run seed_risk first.'))

        # ── Treatments ────────────────────────────────────────────────────────
        treatments_data = [
            {
                'risk': 'Key person dependency — Appointed Actuary',
                'title': 'Develop Appointed Actuary succession plan',
                'description': (
                    'Engage an actuarial recruiter to identify internal and external succession candidates. '
                    'Present a succession plan to the People Committee by Q2 including a shadow development '
                    'program for the most likely internal successor.'
                ),
                'owner': cro,
                'due_date': date.today() - timedelta(days=30),
                'status': 'in_progress',
                'expected_residual_rating': 'medium',
                'completion_notes': '',
            },
            {
                'risk': 'Capital inadequacy under stress',
                'title': 'Implement dynamic capital buffer policy',
                'description': (
                    'Develop and board-approve a dynamic capital buffer policy that sets operating capital '
                    'targets above the APRA PCA, calibrated to our risk profile and stress test results. '
                    'Include trigger levels for management action and board escalation.'
                ),
                'owner': actuary,
                'due_date': date.today() + timedelta(days=60),
                'status': 'not_started',
                'expected_residual_rating': 'medium',
                'completion_notes': '',
            },
            {
                'risk': 'AI model failure in underwriting',
                'title': 'Implement AI/ML model governance framework',
                'description': (
                    'Develop a model governance policy covering model validation, performance monitoring, '
                    'drift detection, and explainability requirements. Apply to all ML models used in '
                    'underwriting and claims decision support within 6 months.'
                ),
                'owner': admin_user or cro,
                'due_date': date.today() + timedelta(days=120),
                'status': 'not_started',
                'expected_residual_rating': 'low',
                'completion_notes': '',
            },
            {
                'risk': 'Reinsurer concentration risk',
                'title': 'Diversify reinsurance panel to minimum three counterparties',
                'description': (
                    'Negotiate treaty terms with at least one additional A-rated reinsurer before the '
                    'next annual contract renewal. Ensure no single reinsurer accounts for more than '
                    '50% of our catastrophe program capacity.'
                ),
                'owner': actuary,
                'due_date': date.today() - timedelta(days=90),
                'status': 'complete',
                'expected_residual_rating': 'low',
                'completion_notes': (
                    'Three-way reinsurance panel established at January renewal. Swiss Re added as third '
                    'treaty counterparty. No single counterparty now exceeds 45% of cat capacity.'
                ),
            },
        ]

        for td in treatments_data:
            risk = risk_objs.get(td['risk'])
            if not risk:
                continue
            RiskTreatment.objects.get_or_create(
                risk=risk,
                title=td['title'],
                defaults={
                    'description': td['description'],
                    'owner': td['owner'],
                    'due_date': td['due_date'],
                    'status': td['status'],
                    'expected_residual_rating': td['expected_residual_rating'],
                    'completion_notes': td.get('completion_notes', ''),
                    'updated_by': cro,
                }
            )
        self.stdout.write('Treatments: OK')

        # ── History ───────────────────────────────────────────────────────────
        r_capital = risk_objs.get('Capital inadequacy under stress')
        r_keyperson = risk_objs.get('Key person dependency — Appointed Actuary')
        r_regulatory = risk_objs.get('Adverse regulatory change — APRA capital standards')

        if r_capital and not RiskHistory.objects.filter(risk=r_capital).exists():
            assessment = r_capital.assessments.filter(is_current=True).first()
            RiskHistory.objects.create(
                risk=r_capital,
                snapshot={
                    'title': r_capital.title,
                    'category': r_capital.category.name,
                    'residual_rating': 'high',
                    'within_appetite': False,
                    'owner': 'Chief Financial Officer',
                    'status': 'active',
                    'notes': 'Initial entry.',
                    'updated_at': '2026-02-01T09:00:00+11:00',
                },
                changed_by=cro,
                change_source='manual',
                change_summary='Owner transferred from CFO to Chief Actuary following ICAAP review. Assessment updated to reflect stress test results.',
            )

        if r_keyperson and not RiskHistory.objects.filter(risk=r_keyperson).exists():
            RiskHistory.objects.create(
                risk=r_keyperson,
                snapshot={
                    'title': r_keyperson.title,
                    'category': r_keyperson.category.name,
                    'residual_rating': 'medium',
                    'within_appetite': False,
                    'owner': 'Chief Risk Officer',
                    'status': 'active',
                    'assessment_stale': False,
                    'updated_at': '2026-01-15T14:30:00+11:00',
                },
                changed_by=None,
                change_source='system_triggered',
                change_summary='Assessment flagged as stale — Capital Breach Notification Procedure control status changed to not_operating.',
            )

        if r_regulatory and not RiskHistory.objects.filter(risk=r_regulatory).exists():
            RiskHistory.objects.create(
                risk=r_regulatory,
                snapshot={
                    'title': r_regulatory.title,
                    'category': r_regulatory.category.name,
                    'residual_rating': 'medium',
                    'within_appetite': True,
                    'owner': 'Chief Actuary',
                    'status': 'active',
                    'notes': '',
                    'updated_at': '2025-11-01T10:00:00+11:00',
                },
                changed_by=cro,
                change_source='manual',
                change_summary='Owner changed from Chief Actuary to CRO. Notes updated with APRA consultation roadmap reference. Rating upgraded after APRA published proposed capital review timeline.',
            )

        self.stdout.write('History: OK')

        self.stdout.write(self.style.SUCCESS(
            f'\nseed_risks complete: '
            f'{RiskCategory.objects.count()} categories, '
            f'{MatrixCell.objects.count()} matrix cells, '
            f'{Risk.objects.count()} risks, '
            f'{RiskAssessment.objects.count()} assessments, '
            f'{RiskControl.objects.count()} risk controls, '
            f'{RiskTreatment.objects.count()} treatments, '
            f'{RiskHistory.objects.count()} history entries'
        ))
