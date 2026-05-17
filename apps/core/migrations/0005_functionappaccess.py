from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0004_user_username'),
    ]

    operations = [
        migrations.CreateModel(
            name='FunctionAppAccess',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('app', models.CharField(choices=[('risk', 'Risk'), ('project', 'Project'), ('actuarial', 'Actuarial'), ('admin', 'Admin')], max_length=50)),
                ('function', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='app_access', to='core.function')),
            ],
            options={
                'db_table': 'core_function_app_access',
                'unique_together': {('function', 'app')},
            },
        ),
    ]
