from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0007_platform_settings'),
    ]

    operations = [
        migrations.AlterField(
            model_name='userfunctionhistory',
            name='user',
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                related_name='function_history',
                to=settings.AUTH_USER_MODEL,
            ),
        ),
    ]
