"""Remediation migration for Phase 1 schema gaps.

The tables created by the obsolete `feature/rbac-implementation` branch are
already on this DB, so migrations 0005–0007 could not apply and were
fake-applied.  This migration adds the pieces that *are* missing:

- accounts_user.updated_at  (AutoNow column – 0005 was supposed to add it)
- GIN index idx_user_districts  (0005)
- Partial index idx_userperm_expires  (0005)
- UNIQUE constraint uniq_role_permission  (0005 – obsolete branch missed it)
- UNIQUE constraint uniq_user_permission  (0005)
- UNIQUE constraint uniq_user_region  (0005)
- UNIQUE constraint uniq_user_device  (0005)
- CHECK constraint ck_userperm_effect  (0005)
- 5 Region records  (0006 seed – regions were never inserted)
- viewer Role (0006 seed – 6/7 roles existed; viewer was missing)
- primary_role backfill for any user still NULL  (0007 – most done, but safe to re-run)

All operations are safe to run on a partially-initialised DB because they
use IF NOT EXISTS / update_or_create / conditional paths.
"""

import django.contrib.postgres.indexes
from django.db import migrations, models


# ---------------------------------------------------------------------------
# Data helpers
# ---------------------------------------------------------------------------

VIEWER_PERMS = [
    'can_access_crop_module', 'can_access_mandi_module',
    'can_access_product_demo_module', 'can_view_own_crop_entries',
    'can_view_own_mandi_entries', 'can_view_own_demo_entries',
    'can_view_own_analytics',
]

REGIONS = [
    # (code, name, state, district, taluka, parent_code)
    # State-level: district and taluka are empty strings (DB has NOT NULL constraint)
    ('MH', 'Maharashtra', 'Maharashtra', '', '', None),
    ('MP', 'Madhya Pradesh', 'Madhya Pradesh', '', '', None),
    ('MH-NAN', 'Nanded', 'Maharashtra', 'Nanded', '', 'MH'),
    ('MH-LAT', 'Latur', 'Maharashtra', 'Latur', '', 'MH'),
    ('MP-KHG', 'Khargone', 'Madhya Pradesh', 'Khargone', '', 'MP'),
]

ROLE_MAP = {
    'field_executive': 'field_executive',
    'admin': 'admin',
    'viewer': 'viewer',
}


def apply_gaps(apps, schema_editor):
    """Seed missing data and add missing constraints/indexes via raw SQL."""
    from django.db import connection

    cursor = connection.cursor()

    # ------------------------------------------------------------------
    # 1. Add accounts_user.updated_at if missing
    # ------------------------------------------------------------------
    cursor.execute("""
        SELECT column_name FROM information_schema.columns
        WHERE table_name='accounts_user' AND column_name='updated_at';
    """)
    if not cursor.fetchone():
        cursor.execute("""
            ALTER TABLE accounts_user
            ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
        """)

    # ------------------------------------------------------------------
    # 2. Add GIN index on accounts_user.districts if missing
    # ------------------------------------------------------------------
    cursor.execute("""
        SELECT indexname FROM pg_indexes
        WHERE tablename='accounts_user' AND indexname='idx_user_districts';
    """)
    if not cursor.fetchone():
        cursor.execute("""
            CREATE INDEX idx_user_districts
            ON accounts_user USING GIN(districts);
        """)

    # ------------------------------------------------------------------
    # 3. Partial index idx_userperm_expires if missing
    # ------------------------------------------------------------------
    cursor.execute("""
        SELECT indexname FROM pg_indexes
        WHERE tablename='accounts_userpermission'
          AND indexname='idx_userperm_expires';
    """)
    if not cursor.fetchone():
        cursor.execute("""
            CREATE INDEX idx_userperm_expires
            ON accounts_userpermission(expires_at)
            WHERE expires_at IS NOT NULL;
        """)

    # ------------------------------------------------------------------
    # 4. UNIQUE constraint uniq_role_permission if missing
    # ------------------------------------------------------------------
    cursor.execute("""
        SELECT conname FROM pg_constraint
        WHERE conrelid='accounts_rolepermission'::regclass
          AND conname='uniq_role_permission';
    """)
    if not cursor.fetchone():
        cursor.execute("""
            ALTER TABLE accounts_rolepermission
            ADD CONSTRAINT uniq_role_permission
            UNIQUE (role_id, permission_id);
        """)

    # ------------------------------------------------------------------
    # 5. UNIQUE constraint uniq_user_permission if missing
    # ------------------------------------------------------------------
    cursor.execute("""
        SELECT conname FROM pg_constraint
        WHERE conrelid='accounts_userpermission'::regclass
          AND conname='uniq_user_permission';
    """)
    if not cursor.fetchone():
        cursor.execute("""
            ALTER TABLE accounts_userpermission
            ADD CONSTRAINT uniq_user_permission
            UNIQUE (user_id, permission_id);
        """)

    # ------------------------------------------------------------------
    # 6. CHECK constraint ck_userperm_effect if missing
    # ------------------------------------------------------------------
    cursor.execute("""
        SELECT conname FROM pg_constraint
        WHERE conrelid='accounts_userpermission'::regclass
          AND conname='ck_userperm_effect';
    """)
    if not cursor.fetchone():
        cursor.execute("""
            ALTER TABLE accounts_userpermission
            ADD CONSTRAINT ck_userperm_effect
            CHECK (effect IN ('allow', 'deny'));
        """)

    # ------------------------------------------------------------------
    # 7. UNIQUE constraint uniq_user_region if missing
    # ------------------------------------------------------------------
    cursor.execute("""
        SELECT conname FROM pg_constraint
        WHERE conrelid='accounts_userregion'::regclass
          AND conname='uniq_user_region';
    """)
    if not cursor.fetchone():
        cursor.execute("""
            ALTER TABLE accounts_userregion
            ADD CONSTRAINT uniq_user_region
            UNIQUE (user_id, region_id);
        """)

    # ------------------------------------------------------------------
    # 8. UNIQUE constraint uniq_user_device if missing
    # ------------------------------------------------------------------
    cursor.execute("""
        SELECT conname FROM pg_constraint
        WHERE conrelid='accounts_deviceregistration'::regclass
          AND conname='uniq_user_device';
    """)
    if not cursor.fetchone():
        cursor.execute("""
            ALTER TABLE accounts_deviceregistration
            ADD CONSTRAINT uniq_user_device
            UNIQUE (user_id, device_id);
        """)

    # ------------------------------------------------------------------
    # 9. Seed missing viewer Role + its permissions
    # ------------------------------------------------------------------
    Permission = apps.get_model('accounts', 'Permission')
    Role = apps.get_model('accounts', 'Role')
    RolePermission = apps.get_model('accounts', 'RolePermission')

    viewer_role, _ = Role.objects.update_or_create(
        code='viewer',
        defaults={
            'name': 'Viewer',
            'description': 'Institutional read-only viewer (backward-compat role).',
            'is_preset': True,
        },
    )
    existing_perm_codes = set(
        RolePermission.objects.filter(role=viewer_role).values_list(
            'permission__codename', flat=True
        )
    )
    for codename in VIEWER_PERMS:
        if codename not in existing_perm_codes:
            try:
                perm = Permission.objects.get(codename=codename)
                RolePermission.objects.get_or_create(role=viewer_role, permission=perm)
            except Permission.DoesNotExist:
                pass  # Permission catalogue incomplete — skip gracefully

    # ------------------------------------------------------------------
    # 10. Seed missing Regions
    # ------------------------------------------------------------------
    Region = apps.get_model('accounts', 'Region')
    by_code = {r.code: r for r in Region.objects.all()}
    for code, name, state, district, taluka, parent_code in REGIONS:
        parent = by_code.get(parent_code) if parent_code else None
        region, _ = Region.objects.update_or_create(
            code=code,
            defaults={
                'name': name,
                'state': state,
                'district': district,
                'taluka': taluka,
                'parent': parent,
            },
        )
        by_code[code] = region

    # ------------------------------------------------------------------
    # 11. Backfill primary_role for any user still NULL
    # ------------------------------------------------------------------
    User = apps.get_model('accounts', 'User')
    roles = {r.code: r for r in Role.objects.filter(code__in=ROLE_MAP.values())}
    for legacy_value, role_code in ROLE_MAP.items():
        role = roles.get(role_code)
        if role is None:
            continue
        User.objects.filter(role=legacy_value, primary_role__isnull=True).update(
            primary_role=role
        )


def reverse_gaps(apps, schema_editor):
    """Best-effort reversal — only removes data we added, not schema changes
    (dropping columns / constraints on a live DB is destructive; not reversible here)."""
    Region = apps.get_model('accounts', 'Region')
    Region.objects.filter(code__in=[r[0] for r in REGIONS]).delete()

    Role = apps.get_model('accounts', 'Role')
    Role.objects.filter(code='viewer').delete()


class Migration(migrations.Migration):
    """Add missing schema pieces and seed data that the obsolete branch left behind."""

    dependencies = [
        ('accounts', '0007_backfill_primary_role'),
    ]

    operations = [
        migrations.RunPython(apply_gaps, reverse_gaps),
    ]
