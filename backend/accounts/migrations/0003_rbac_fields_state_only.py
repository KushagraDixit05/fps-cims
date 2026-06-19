import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0002_alter_user_email'),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            state_operations=[
                migrations.AddField(
                    model_name='user',
                    name='employee_id',
                    field=models.CharField(blank=True, max_length=50, null=True),
                ),
                migrations.AddField(
                    model_name='user',
                    name='state',
                    field=models.CharField(blank=True, default='', max_length=100),
                ),
                migrations.AddField(
                    model_name='user',
                    name='districts',
                    field=models.JSONField(default=list),
                ),
                migrations.AddField(
                    model_name='user',
                    name='profile_photo',
                    field=models.CharField(blank=True, default='', max_length=255),
                ),
                migrations.AddField(
                    model_name='user',
                    name='last_login_device',
                    field=models.CharField(blank=True, default='', max_length=200),
                ),
                migrations.AddField(
                    model_name='user',
                    name='last_login_ip',
                    field=models.GenericIPAddressField(blank=True, null=True),
                ),
                migrations.AddField(
                    model_name='user',
                    name='deactivation_reason',
                    field=models.TextField(blank=True, default=''),
                ),
                migrations.AddField(
                    model_name='user',
                    name='deactivated_at',
                    field=models.DateTimeField(blank=True, null=True),
                ),
                migrations.AddField(
                    model_name='user',
                    name='primary_role_id',
                    field=models.UUIDField(blank=True, null=True),
                ),
                migrations.AddField(
                    model_name='user',
                    name='created_by',
                    field=models.ForeignKey(
                        blank=True, null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name='created_users',
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                migrations.AddField(
                    model_name='user',
                    name='deactivated_by',
                    field=models.ForeignKey(
                        blank=True, null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name='deactivated_users',
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                migrations.AddField(
                    model_name='user',
                    name='reporting_to',
                    field=models.ForeignKey(
                        blank=True, null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name='reportees',
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            database_operations=[],
        ),
    ]
