def handle_control_status_change(sender, instance, created, **kwargs):
    if created:
        return
    # Only trigger on statuses that indicate the control is not functioning
    if instance.status not in ('not_operating', 'not_tested'):
        return
    from .models import RiskControl, Risk
    risk_ids = RiskControl.objects.filter(control=instance).values_list('risk_id', flat=True)
    if not risk_ids:
        return
    Risk.objects.filter(
        id__in=risk_ids,
        status='active',
        assessment_stale=False,
    ).update(assessment_stale=True, last_change_source='system_triggered')
