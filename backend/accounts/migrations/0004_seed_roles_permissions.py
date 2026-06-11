from django.db import migrations


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
    ('can_edit_any_crop_visit', 'Edit any visit', 'crop_monitoring', 'update'),
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

ROLES = [
    {'name': 'Field Executive', 'code': 'field_executive', 'description': 'On-ground data collector.'},
    {'name': 'Checker', 'code': 'checker', 'description': 'Verifies and approves data submitted by Field Executives.'},
    {'name': 'Regional Head', 'code': 'regional_head', 'description': 'Oversees a geographic region.'},
    {'name': 'Manager', 'code': 'manager', 'description': 'Manages multiple regional heads.'},
    {'name': 'Admin', 'code': 'admin', 'description': 'Platform administrator.'},
    {'name': 'Super Admin', 'code': 'super_admin', 'description': 'Root access. Reserved for the platform team.'},
]

ROLE_PERMISSIONS = {
    'field_executive': [
        'can_access_crop_module', 'can_create_crop_visit', 'can_edit_own_crop_visit',
        'can_submit_crop_visit', 'can_view_own_crop_entries',
        'can_access_mandi_module', 'can_create_mandi_arrival', 'can_edit_own_mandi_arrival',
        'can_view_own_mandi_entries',
        'can_access_product_demo_module', 'can_create_product_demo', 'can_edit_own_product_demo',
        'can_view_own_demo_entries',
        'can_view_own_analytics',
        'can_sync_data', 'can_sync_offline',
    ],
    'checker': [
        'can_access_crop_module', 'can_create_crop_visit', 'can_edit_own_crop_visit',
        'can_edit_any_crop_visit', 'can_submit_crop_visit', 'can_approve_crop_visit',
        'can_reject_crop_visit', 'can_request_revision_crop',
        'can_view_own_crop_entries', 'can_view_region_crop_entries',
        'can_access_mandi_module', 'can_create_mandi_arrival', 'can_edit_own_mandi_arrival',
        'can_edit_any_mandi_arrival', 'can_approve_mandi_arrival', 'can_reject_mandi_arrival',
        'can_view_own_mandi_entries', 'can_view_region_mandi_entries',
        'can_access_product_demo_module', 'can_create_product_demo', 'can_edit_own_product_demo',
        'can_edit_any_product_demo', 'can_approve_product_demo',
        'can_view_own_demo_entries', 'can_view_region_demo_entries',
        'can_view_own_analytics', 'can_view_team_analytics',
        'can_sync_data', 'can_sync_offline',
    ],
    'regional_head': [
        'can_access_crop_module', 'can_create_crop_visit', 'can_edit_own_crop_visit',
        'can_edit_any_crop_visit', 'can_delete_crop_visit', 'can_submit_crop_visit',
        'can_approve_crop_visit', 'can_reject_crop_visit', 'can_request_revision_crop',
        'can_view_own_crop_entries', 'can_view_region_crop_entries',
        'can_access_mandi_module', 'can_create_mandi_arrival', 'can_edit_own_mandi_arrival',
        'can_edit_any_mandi_arrival', 'can_approve_mandi_arrival', 'can_reject_mandi_arrival',
        'can_view_own_mandi_entries', 'can_view_region_mandi_entries',
        'can_access_product_demo_module', 'can_create_product_demo', 'can_edit_own_product_demo',
        'can_edit_any_product_demo', 'can_approve_product_demo',
        'can_view_own_demo_entries', 'can_view_region_demo_entries',
        'can_view_own_analytics', 'can_view_team_analytics', 'can_export_reports',
        'can_sync_data', 'can_sync_offline',
    ],
    'manager': [
        'can_access_crop_module', 'can_create_crop_visit', 'can_edit_own_crop_visit',
        'can_edit_any_crop_visit', 'can_delete_crop_visit', 'can_submit_crop_visit',
        'can_approve_crop_visit', 'can_reject_crop_visit', 'can_request_revision_crop',
        'can_view_own_crop_entries', 'can_view_region_crop_entries', 'can_view_all_crop_entries',
        'can_access_mandi_module', 'can_create_mandi_arrival', 'can_edit_own_mandi_arrival',
        'can_edit_any_mandi_arrival', 'can_approve_mandi_arrival', 'can_reject_mandi_arrival',
        'can_view_own_mandi_entries', 'can_view_region_mandi_entries', 'can_view_all_mandi_entries',
        'can_access_product_demo_module', 'can_create_product_demo', 'can_edit_own_product_demo',
        'can_edit_any_product_demo', 'can_approve_product_demo',
        'can_view_own_demo_entries', 'can_view_region_demo_entries', 'can_view_all_demo_entries',
        'can_view_own_analytics', 'can_view_team_analytics', 'can_view_all_analytics',
        'can_export_reports', 'can_view_executive_productivity',
        'can_sync_data', 'can_sync_offline',
    ],
    'admin': [
        'can_manage_users', 'can_assign_roles', 'can_assign_permissions',
        'can_view_audit_logs', 'can_manage_regions', 'can_view_all_users',
        'can_reset_passwords', 'can_view_sync_logs', 'can_force_logout',
        'can_access_crop_module', 'can_create_crop_visit', 'can_edit_own_crop_visit',
        'can_edit_any_crop_visit', 'can_delete_crop_visit', 'can_submit_crop_visit',
        'can_approve_crop_visit', 'can_reject_crop_visit', 'can_request_revision_crop',
        'can_view_own_crop_entries', 'can_view_region_crop_entries', 'can_view_all_crop_entries',
        'can_access_mandi_module', 'can_create_mandi_arrival', 'can_edit_own_mandi_arrival',
        'can_edit_any_mandi_arrival', 'can_delete_mandi_arrival',
        'can_approve_mandi_arrival', 'can_reject_mandi_arrival',
        'can_view_own_mandi_entries', 'can_view_region_mandi_entries', 'can_view_all_mandi_entries',
        'can_access_product_demo_module', 'can_create_product_demo', 'can_edit_own_product_demo',
        'can_edit_any_product_demo', 'can_delete_product_demo', 'can_approve_product_demo',
        'can_view_own_demo_entries', 'can_view_region_demo_entries', 'can_view_all_demo_entries',
        'can_view_own_analytics', 'can_view_team_analytics', 'can_view_all_analytics',
        'can_export_reports', 'can_view_executive_productivity',
        'can_sync_data', 'can_sync_offline',
    ],
    'super_admin': [p[0] for p in PERMISSIONS],  # all permissions
}


def seed_roles_and_permissions(apps, schema_editor):
    Permission = apps.get_model('accounts', 'Permission')
    Role = apps.get_model('accounts', 'Role')
    RolePermission = apps.get_model('accounts', 'RolePermission')

    perm_map = {}
    for codename, label, module, category in PERMISSIONS:
        perm, _ = Permission.objects.get_or_create(
            codename=codename,
            defaults={'label': label, 'module': module, 'category': category},
        )
        perm_map[codename] = perm

    for role_data in ROLES:
        role, _ = Role.objects.get_or_create(
            code=role_data['code'],
            defaults={
                'name': role_data['name'],
                'description': role_data['description'],
                'is_preset': True,
            },
        )
        for codename in ROLE_PERMISSIONS.get(role_data['code'], []):
            if codename in perm_map:
                RolePermission.objects.get_or_create(role=role, permission=perm_map[codename])


def backfill_primary_role(apps, schema_editor):
    User = apps.get_model('accounts', 'User')
    Role = apps.get_model('accounts', 'Role')

    ROLE_CODE_MAP = {
        'field_executive': 'field_executive',
        'admin': 'admin',
        'viewer': 'field_executive',  # viewers default to FE role until custom role added
    }

    for user in User.objects.filter(primary_role__isnull=True):
        code = ROLE_CODE_MAP.get(user.role, 'field_executive')
        try:
            role = Role.objects.get(code=code)
            user.primary_role = role
            user.save(update_fields=['primary_role'])
        except Role.DoesNotExist:
            pass


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0003_rolepermission_userpermission_userregion_and_more'),
    ]

    operations = [
        migrations.RunPython(seed_roles_and_permissions, migrations.RunPython.noop),
        migrations.RunPython(backfill_primary_role, migrations.RunPython.noop),
    ]
