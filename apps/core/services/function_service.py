from datetime import date, timedelta
from django.db import transaction
from django.core.exceptions import ValidationError


def assign_function(user, function, assigned_by, start_date=None, notes=''):
    from apps.core.models import UserFunctionHistory

    if start_date is None:
        start_date = date.today()

    if user.function_id is not None and user.function_id == function.id:
        raise ValidationError(f'{user.email} already holds function {function.code}.')

    with transaction.atomic():
        UserFunctionHistory.objects.filter(user=user, end_date__isnull=True).update(
            end_date=start_date - timedelta(days=1)
        )
        UserFunctionHistory.objects.create(
            user=user,
            function=function,
            start_date=start_date,
            end_date=None,
            assigned_by=assigned_by,
            notes=notes,
        )
        user.function = function
        user.save(update_fields=['function'])


def remove_function(user, assigned_by, end_date=None, notes=''):
    from apps.core.models import UserFunctionHistory

    if user.function_id is None:
        raise ValidationError(f'{user.email} has no current function to remove.')

    if end_date is None:
        end_date = date.today()

    with transaction.atomic():
        UserFunctionHistory.objects.filter(user=user, end_date__isnull=True).update(
            end_date=end_date,
        )
        user.function = None
        user.save(update_fields=['function'])
