import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('risks', '0002_risk_owner_to_function'),
        ('project', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='risk',
            name='risk_type',
            field=models.CharField(
                choices=[('bau', 'BAU'), ('execution', 'Execution'), ('delivered', 'Delivered')],
                default='bau',
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name='risk',
            name='project',
            field=models.ForeignKey(
                blank=True, null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='risks',
                to='project.project',
            ),
        ),
    ]
