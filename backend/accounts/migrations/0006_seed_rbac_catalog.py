"""Seed the RBAC catalogue: permission catalogue, preset roles, role→permission
links, and a light geographic region hierarchy.

Mirrors docs/rbac/02-PERMISSION-ENGINE.md (catalogue) and
docs/rbac/03-PRESET-ROLES.md (roles + matrix). Fully reversible.
"""
from django.db import migrations

# (codename, label, module, category)
PERMISSIONS = [
    # Global / Admin
    ('can_manage_users', 'Create/edit/deactivate users', 'admin', 'admin'),
    ('can_assign_roles', 'Assign or change user roles', 'admin', 'admin'),
    ('can_assign_permissions', 'Grant/deny individual permissions', 'admin', 'admin'),
    ('can_view_audit_logs', 'Read audit trail', 'admin', 'admin'),
    ('can_export_audit_logs', 'Export audit CSV', 'admin', 'admin'),
    ('can_manage_regions', 'Create/edit regions', 'admin', 'admin'),
    ('can_view_all_users', 'See all users across regions', 'admin', 'admin'),
    ('can_reset_passwords', 'Trigger password reset for any user', 'admin', 'admin'),
    ('can_view_sync_logs', 'See mobile sync activity', 'admin', 'admin'),
    ('can_force_logout', 'Blacklist a device/session', 'admin', 'admin'),
    # Crop Monitoring
    ('can_access_crop_module', 'Enter the Crop Monitoring module', 'crop_monitoring', 'module'),
    ('can_create_crop_visit', 'Create new farmer visit', 'crop_monitoring', 'create'),
    ('can_edit_own_crop_visit', 'Edit own unsubmitted visit', 'crop_monitoring', 'update'),
    ('can_edit_any_crop_visit', 'Edit any visit (checker/manager)', 'crop_monitoring', 'update'),
    ('can_delete_crop_visit', 'Delete a visit', 'crop_monitoring', 'delete'),
    ('can_submit_crop_visit', 'Submit visit for approval', 'crop_monitoring', 'create'),
    ('can_approve_crop_visit', 'Approve submitted visit', 'crop_monitoring', 'approve'),
    ('can_reject_crop_visit', 'Reject submitted visit', 'crop_monitoring', 'approve'),
    ('can_request_revision_crop', 'Request revision on a visit', 'crop_monitoring', 'approve'),
    ('can_view_own_crop_entries', 'See own entries', 'crop_monitoring', 'read'),
    ('can_view_region_crop_entries', 'See entries in assigned region', 'crop_monitoring', 'read'),
    ('can_view_all_crop_entries', 'See all entries platform-wide', 'crop_monitoring', 'read'),
    # Mandi Arrival
    ('can_access_mandi_module', 'Enter the Mandi Arrival module', 'mandi', 'module'),
    ('can_create_mandi_arrival', 'Log new arrival', 'mandi', 'create'),
    ('can_edit_own_mandi_arrival', 'Edit own unsubmitted arrival', 'mandi', 'update'),
    ('can_edit_any_mandi_arrival', 'Edit any arrival', 'mandi', 'update'),
    ('can_delete_mandi_arrival', 'Delete arrival record', 'mandi', 'delete'),
    ('can_approve_mandi_arrival', 'Approve arrival', 'mandi', 'approve'),
    ('can_reject_mandi_arrival', 'Reject arrival', 'mandi', 'approve'),
    ('can_view_own_mandi_entries', 'See own mandi entries', 'mandi', 'read'),
    ('can_view_region_mandi_entries', 'See region mandi entries', 'mandi', 'read'),
    ('can_view_all_mandi_entries', 'See all mandi entries', 'mandi', 'read'),
    # Product Demo
    ('can_access_product_demo_module', 'Enter the Product Demo module', 'product_demo', 'module'),
    ('can_create_product_demo', 'Create demo record', 'product_demo', 'create'),
    ('can_edit_own_product_demo', 'Edit own demo', 'product_demo', 'update'),
    ('can_edit_any_product_demo', 'Edit any demo', 'product_demo', 'update'),
    ('can_delete_product_demo', 'Delete demo record', 'product_demo', 'delete'),
    ('can_approve_product_demo', 'Approve demo', 'product_demo', 'approve'),
    ('can_view_own_demo_entries', 'See own demo entries', 'product_demo', 'read'),
    ('can_view_region_demo_entries', 'See region demo entries', 'product_demo', 'read'),
    ('can_view_all_demo_entries', 'See all demo entries', 'product_demo', 'read'),
    # Analytics
    ('can_view_own_analytics', 'Own performance dashboard', 'analytics', 'read'),
    ('can_view_team_analytics', 'Team/region analytics', 'analytics', 'read'),
    ('can_view_all_analytics', 'Platform-wide analytics', 'analytics', 'read'),
    ('can_export_reports', 'Download analytics exports', 'analytics', 'export'),
    ('can_view_executive_productivity', 'See per-FE productivity stats', 'analytics', 'read'),
    # Sync
    ('can_sync_data', 'Perform WatermelonDB sync', 'sync', 'sync'),
    ('can_sync_offline', 'Use offline data collection', 'sync', 'sync'),
]

# --- Cumulative role permission sets (per 03-PRESET-ROLES.md inheritance) ---
FE_PERMS = [
    'can_access_crop_module', 'can_create_crop_visit', 'can_edit_own_crop_visit',
    'can_submit_crop_visit', 'can_view_own_crop_entries',
    'can_access_mandi_module', 'can_create_mandi_arrival',
    'can_edit_own_mandi_arrival', 'can_view_own_mandi_entries',
    'can_access_product_demo_module', 'can_create_product_demo',
    'can_edit_own_product_demo', 'can_view_own_demo_entries',
    'can_view_own_analytics', 'can_sync_data', 'can_sync_offline',
]
CHECKER_EXTRA = [
    'can_edit_any_crop_visit', 'can_approve_crop_visit', 'can_reject_crop_visit',
    'can_request_revision_crop', 'can_view_region_crop_entries',
    'can_edit_any_mandi_arrival', 'can_approve_mandi_arrival',
    'can_reject_mandi_arrival', 'can_view_region_mandi_entries',
    'can_edit_any_product_demo', 'can_approve_product_demo',
    'can_view_region_demo_entries', 'can_view_team_analytics',
]
REGIONAL_HEAD_EXTRA = ['can_delete_crop_visit', 'can_export_reports']
MANAGER_EXTRA = [
    'can_view_all_analytics', 'can_view_executive_productivity',
    'can_view_all_crop_entries', 'can_view_all_mandi_entries',
    'can_view_all_demo_entries',
]
ADMIN_EXTRA = [
    'can_manage_users', 'can_assign_roles', 'can_assign_permissions',
    'can_manage_regions', 'can_view_all_users', 'can_reset_passwords',
    'can_view_audit_logs', 'can_view_sync_logs', 'can_force_logout',
    'can_delete_mandi_arrival', 'can_delete_product_demo',
]
VIEWER_PERMS = [
    'can_access_crop_module', 'can_access_mandi_module',
    'can_access_product_demo_module', 'can_view_own_crop_entries',
    'can_view_own_mandi_entries', 'can_view_own_demo_entries',
    'can_view_own_analytics',
]

_fe = list(FE_PERMS)
_checker = _fe + CHECKER_EXTRA
_regional = _checker + REGIONAL_HEAD_EXTRA
_manager = _regional + MANAGER_EXTRA
_admin = _manager + ADMIN_EXTRA
_super = [p[0] for p in PERMISSIONS]  # all

# (code, name, description, [permission codenames])
ROLES = [
    ('field_executive', 'Field Executive', 'On-ground data collector (mobile app).', _fe),
    ('checker', 'Checker', 'Verifies and approves Field Executive submissions.', _checker),
    ('regional_head', 'Regional Head', 'Oversees a geographic region.', _regional),
    ('manager', 'Manager', 'Manages multiple regional heads; cross-region analytics.', _manager),
    ('admin', 'Admin', 'Platform administrator: users, roles, regions, audit.', _admin),
    ('super_admin', 'Super Admin', 'Root access; all permissions incl. audit export.', _super),
    ('viewer', 'Viewer', 'Institutional read-only viewer (backward-compat role).', VIEWER_PERMS),
]

# (code, name, state, district, taluka, parent_code)  parent_code None => state-level
# district and taluka use empty string (not None) because the DB column is NOT NULL.
REGIONS = [
    ('MH', 'Maharashtra', 'Maharashtra', '', '', None),
    ('MP', 'Madhya Pradesh', 'Madhya Pradesh', '', '', None),
    ('MH-NAN', 'Nanded', 'Maharashtra', 'Nanded', '', 'MH'),
    ('MH-LAT', 'Latur', 'Maharashtra', 'Latur', '', 'MH'),
    ('MP-KHG', 'Khargone', 'Madhya Pradesh', 'Khargone', '', 'MP'),
]

ROLE_CODES = [r[0] for r in ROLES]
PERMISSION_CODENAMES = [p[0] for p in PERMISSIONS]
REGION_CODES = [r[0] for r in REGIONS]


def seed(apps, schema_editor):
    Permission = apps.get_model('accounts', 'Permission')
    Role = apps.get_model('accounts', 'Role')
    RolePermission = apps.get_model('accounts', 'RolePermission')
    Region = apps.get_model('accounts', 'Region')

    perms = {}
    for codename, label, module, category in PERMISSIONS:
        obj, _ = Permission.objects.update_or_create(
            codename=codename,
            defaults={'label': label, 'module': module, 'category': category},
        )
        perms[codename] = obj

    for code, name, description, codenames in ROLES:
        role, _ = Role.objects.update_or_create(
            code=code,
            defaults={'name': name, 'description': description, 'is_preset': True},
        )
        existing = set(
            RolePermission.objects.filter(role=role).values_list(
                'permission__codename', flat=True
            )
        )
        for codename in codenames:
            if codename not in existing:
                RolePermission.objects.create(role=role, permission=perms[codename])

    by_code = {}
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


def unseed(apps, schema_editor):
    Permission = apps.get_model('accounts', 'Permission')
    Role = apps.get_model('accounts', 'Role')
    RolePermission = apps.get_model('accounts', 'RolePermission')
    Region = apps.get_model('accounts', 'Region')
    User = apps.get_model('accounts', 'User')

    # Detach any users pointing at preset roles so RESTRICT FK won't block deletion.
    User.objects.filter(primary_role__code__in=ROLE_CODES).update(primary_role=None)
    RolePermission.objects.filter(role__code__in=ROLE_CODES).delete()
    Role.objects.filter(code__in=ROLE_CODES).delete()
    Permission.objects.filter(codename__in=PERMISSION_CODENAMES).delete()
    Region.objects.filter(code__in=REGION_CODES).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0005_rolepermission_userpermission_userregion_and_more'),
    ]

    operations = [
        migrations.RunPython(seed, unseed),
    ]
