from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0006_provisioned_user'),
    ]

    operations = [
        migrations.CreateModel(
            name='PlatformSettings',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('email_domain', models.CharField(default='lifeplatform.internal', max_length=255)),
            ],
            options={
                'db_table': 'core_platform_settings',
            },
        ),
    ]
