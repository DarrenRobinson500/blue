from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('risks', '0003_risk_type_and_project'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AlterField(
            model_name='riskhistory',
            name='risk',
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                related_name='history',
                to='risks.risk',
            ),
        ),
        migrations.AlterField(
            model_name='riskassessment',
            name='assessed_by',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='assessments_made',
                to=settings.AUTH_USER_MODEL,
            ),
        ),
    ]
