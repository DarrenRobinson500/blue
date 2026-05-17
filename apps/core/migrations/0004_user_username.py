from django.db import migrations, models


def backfill_username(apps, schema_editor):
    User = apps.get_model('core', 'User')
    for user in User.objects.all():
        user.username = user.email.split('@')[0].lower()
        user.save(update_fields=['username'])


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0003_add_function_parent'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='username',
            field=models.CharField(max_length=150, default='', blank=True),
        ),
        migrations.RunPython(backfill_username, migrations.RunPython.noop),
        migrations.AlterField(
            model_name='user',
            name='username',
            field=models.CharField(max_length=150, unique=True),
        ),
    ]
