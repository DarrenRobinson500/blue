from django.apps import AppConfig


class RisksConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.risks'
    label = 'risks'

    def ready(self):
        from django.db.models.signals import post_save
        from apps.risk.models import Control
        from .signals import handle_control_status_change
        post_save.connect(handle_control_status_change, sender=Control)
