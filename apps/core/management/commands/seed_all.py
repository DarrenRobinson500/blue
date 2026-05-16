from django.core.management.base import BaseCommand
from django.core.management import call_command


class Command(BaseCommand):
    help = 'Run all seed commands'

    def handle(self, *args, **kwargs):
        call_command('seed_users')
        call_command('seed_core')
        call_command('seed_risk')
        call_command('seed_actuarial')
        self.stdout.write(self.style.SUCCESS('seed_all complete.'))
