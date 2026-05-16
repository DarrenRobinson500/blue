from django.core.management.base import BaseCommand
from apps.core.models import User


SEED_USERS = [
    {'email': 'admin@lifeplatform.com.au', 'role': 'admin', 'is_staff': True, 'is_superuser': True, 'password': 'admin1234'},
    {'email': 'cro@lifeplatform.com.au', 'role': 'cro', 'password': 'cro12345'},
    {'email': 'actuary@lifeplatform.com.au', 'role': 'chief_actuary', 'password': 'actuary1'},
]


def seed_users():
    created = []
    for u in SEED_USERS:
        password = u.pop('password')
        user, is_new = User.objects.get_or_create(email=u['email'], defaults=u)
        if is_new:
            user.set_password(password)
            user.save()
            created.append(user.email)
        u['password'] = password  # restore for idempotency
    return created


class Command(BaseCommand):
    help = 'Seed shared users'

    def handle(self, *args, **kwargs):
        created = seed_users()
        if created:
            self.stdout.write(self.style.SUCCESS(f'Created users: {", ".join(created)}'))
        else:
            self.stdout.write('Users already exist — no changes made.')
