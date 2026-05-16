from datetime import date
from django.core.management.base import BaseCommand
from apps.core.models import Function, User
from apps.core.services.function_service import assign_function

FUNCTIONS = [
    {
        'name': 'Chief Risk Officer',
        'code': 'CRO',
        'description': 'Owns the risk management framework, controls library, and regulatory obligations register. FAR accountable person.',
    },
    {
        'name': 'Chief Actuary',
        'code': 'CHIEF_ACT',
        'description': 'Owns pricing, valuation, and assumption governance. Manages the appointed actuary relationship. FAR accountable person.',
    },
    {
        'name': 'Chief Financial Officer',
        'code': 'CFO',
        'description': 'Owns the general ledger, AASB 17 reporting, and APRA financial returns. FAR accountable person.',
    },
    {
        'name': 'Chief Underwriter',
        'code': 'CHIEF_UW',
        'description': 'Owns underwriting guidelines, authority limits, and the underwriting AI governance framework. FAR accountable person.',
    },
    {
        'name': 'Head of Claims',
        'code': 'HEAD_CLAIMS',
        'description': 'Owns claims handling procedures, the claims authority matrix, and the claims AI governance framework. FAR senior manager.',
    },
    {
        'name': 'Risk Analyst',
        'code': 'RISK_ANALYST',
        'description': 'Supports the CRO. Triages EIL items, maintains the controls library, and monitors CPS 230 vendor obligations.',
    },
]

ASSIGNMENTS = [
    {'email': 'cro@lifeplatform.com.au', 'code': 'CRO'},
    {'email': 'actuary@lifeplatform.com.au', 'code': 'CHIEF_ACT'},
]


def seed_functions():
    created = []
    for f in FUNCTIONS:
        fn, is_new = Function.objects.get_or_create(code=f['code'], defaults={
            'name': f['name'],
            'description': f['description'],
        })
        if is_new:
            created.append(fn.code)
    return created


def seed_assignments():
    admin = User.objects.get(email='admin@lifeplatform.com.au')
    assigned = []
    for a in ASSIGNMENTS:
        user = User.objects.get(email=a['email'])
        if user.function_id is not None:
            continue
        fn = Function.objects.get(code=a['code'])
        assign_function(user, fn, admin, start_date=date(2026, 1, 1), notes='Seed assignment')
        assigned.append(user.email)
    return assigned


class Command(BaseCommand):
    help = 'Seed functions and function assignments'

    def handle(self, *args, **kwargs):
        created = seed_functions()
        if created:
            self.stdout.write(self.style.SUCCESS(f'Created functions: {", ".join(created)}'))
        else:
            self.stdout.write('Functions already exist — no changes made.')

        assigned = seed_assignments()
        if assigned:
            self.stdout.write(self.style.SUCCESS(f'Assigned functions to: {", ".join(assigned)}'))
        else:
            self.stdout.write('Assignments already exist — no changes made.')
