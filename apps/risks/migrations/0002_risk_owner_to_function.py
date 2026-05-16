from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('risks', '0001_initial'),
        ('core', '0003_add_function_parent'),
    ]

    operations = [
        migrations.AlterField(
            model_name='risk',
            name='owner',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='owned_risks',
                to='core.function',
            ),
        ),
    ]
