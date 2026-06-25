"""Backfill ``User.primary_role`` from the legacy ``role`` CharField.

Per docs/rbac/01-DATABASE-SCHEMA.md migration strategy. The legacy ``role``
CharField is retained as a fallback for one sprint. Reversible: clears the FK.
"""
from django.db import migrations

# legacy CharField value -> Role.code (identity map; both use the same codes)
ROLE_MAP = {
    'field_executive': 'field_executive',
    'admin': 'admin',
    'viewer': 'viewer',
}


def backfill(apps, schema_editor):
    User = apps.get_model('accounts', 'User')
    Role = apps.get_model('accounts', 'Role')

    roles = {r.code: r for r in Role.objects.filter(code__in=ROLE_MAP.values())}
    for legacy_value, role_code in ROLE_MAP.items():
        role = roles.get(role_code)
        if role is None:
            continue
        User.objects.filter(role=legacy_value, primary_role__isnull=True).update(
            primary_role=role
        )


def clear(apps, schema_editor):
    User = apps.get_model('accounts', 'User')
    User.objects.update(primary_role=None)


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0006_seed_rbac_catalog'),
    ]

    operations = [
        migrations.RunPython(backfill, clear),
    ]
