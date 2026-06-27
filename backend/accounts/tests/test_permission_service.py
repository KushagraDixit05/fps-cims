"""
accounts/tests/test_permission_service.py
==========================================
Unit tests for PermissionService (ABAC-lite permission resolution).

Tests cover:
- Role-based permission grants
- User-level allow/deny overrides (deny always wins)
- Expired override exclusion
- Inactive user returns empty set
- Cache hit/miss behaviour (uses Django's test cache — no real Redis needed)

Runs against the test PostgreSQL database (seeded by migrations).
The seeded catalogue already has 48 permissions and 7 roles, but each test
creates its own isolated Role + Permission records to avoid conflicts.
"""
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import TestCase, override_settings
from django.utils import timezone

User = get_user_model()


# Use dummy cache in tests so we don't need Redis running.
@override_settings(
    CACHES={'default': {'BACKEND': 'django.core.cache.backends.locmem.LocMemCache'}},
    AUDIT_ENGINE_ENABLED=False,
)
class PermissionServiceTest(TestCase):

    def setUp(self):
        cache.clear()

        from accounts.models.permission import Permission
        from accounts.models.role import Role, RolePermission

        self.role = Role.objects.create(
            name='PS Test Role',
            code='ps_test_role',
            is_preset=False,
        )

        self.perm_view = Permission.objects.create(
            codename='ps_can_view_thing',
            label='View Thing',
            module='test_module',
            category='view',
        )
        self.perm_edit = Permission.objects.create(
            codename='ps_can_edit_thing',
            label='Edit Thing',
            module='test_module',
            category='edit',
        )
        self.perm_delete = Permission.objects.create(
            codename='ps_can_delete_thing',
            label='Delete Thing',
            module='test_module',
            category='delete',
        )

        # Grant view + edit to the role
        RolePermission.objects.create(role=self.role, permission=self.perm_view)
        RolePermission.objects.create(role=self.role, permission=self.perm_edit)

        self.user = User.objects.create_user(
            username='ps_testuser',
            password='testpass123',
            primary_role=self.role,
        )

    def tearDown(self):
        cache.clear()

    # ── Basic role grants ────────────────────────────────────────────────────

    def test_role_permissions_included(self):
        from accounts.services.permission_service import PermissionService

        perms = PermissionService.get_user_permissions(self.user)

        self.assertIn('ps_can_view_thing', perms)
        self.assertIn('ps_can_edit_thing', perms)

    def test_non_granted_permission_excluded(self):
        from accounts.services.permission_service import PermissionService

        perms = PermissionService.get_user_permissions(self.user)

        self.assertNotIn('ps_can_delete_thing', perms)

    # ── Allow override ───────────────────────────────────────────────────────

    def test_allow_override_adds_ungranted_permission(self):
        from accounts.models.user_permission import UserPermission
        from accounts.services.permission_service import PermissionService

        UserPermission.objects.create(
            user=self.user,
            permission=self.perm_delete,
            effect='allow',
        )

        perms = PermissionService.get_user_permissions(self.user)

        self.assertIn('ps_can_delete_thing', perms)

    # ── Deny override ────────────────────────────────────────────────────────

    def test_deny_override_removes_role_granted_permission(self):
        from accounts.models.user_permission import UserPermission
        from accounts.services.permission_service import PermissionService

        UserPermission.objects.create(
            user=self.user,
            permission=self.perm_view,
            effect='deny',
        )

        perms = PermissionService.get_user_permissions(self.user)

        self.assertNotIn('ps_can_view_thing', perms)
        # Other role permissions still present
        self.assertIn('ps_can_edit_thing', perms)

    def test_deny_beats_allow_when_both_exist(self):
        """
        If the same codename appears as both allow and deny, deny wins because
        PermissionService processes overrides in order: deny calls .discard()
        which removes even if allow added it earlier.
        """
        from accounts.models.user_permission import UserPermission
        from accounts.services.permission_service import PermissionService

        # The deny override on perm_view (which is role-granted) should win.
        UserPermission.objects.create(
            user=self.user,
            permission=self.perm_view,
            effect='deny',
        )

        perms = PermissionService.get_user_permissions(self.user)

        self.assertNotIn('ps_can_view_thing', perms)

    # ── Expiry ───────────────────────────────────────────────────────────────

    def test_expired_allow_override_excluded(self):
        from accounts.models.user_permission import UserPermission
        from accounts.services.permission_service import PermissionService

        UserPermission.objects.create(
            user=self.user,
            permission=self.perm_delete,
            effect='allow',
            expires_at=timezone.now() - timedelta(hours=1),  # already expired
        )

        perms = PermissionService.get_user_permissions(self.user)

        self.assertNotIn('ps_can_delete_thing', perms)

    def test_future_expiry_allow_override_included(self):
        from accounts.models.user_permission import UserPermission
        from accounts.services.permission_service import PermissionService

        UserPermission.objects.create(
            user=self.user,
            permission=self.perm_delete,
            effect='allow',
            expires_at=timezone.now() + timedelta(hours=24),  # still valid
        )

        perms = PermissionService.get_user_permissions(self.user)

        self.assertIn('ps_can_delete_thing', perms)

    # ── Inactive user ────────────────────────────────────────────────────────

    def test_inactive_user_returns_empty_set(self):
        from accounts.services.permission_service import PermissionService

        self.user.is_active = False
        self.user.save()

        perms = PermissionService.get_user_permissions(self.user)

        self.assertEqual(perms, set())

    # ── Cache behaviour ──────────────────────────────────────────────────────

    def test_result_is_cached_after_first_call(self):
        from accounts.services.permission_service import PermissionService

        # Prime the cache
        PermissionService.get_user_permissions(self.user)

        cache_key = PermissionService._cache_key(self.user.id)
        self.assertIsNotNone(cache.get(cache_key))

    def test_cache_miss_falls_back_to_db(self):
        from accounts.services.permission_service import PermissionService

        # Ensure cache is empty
        cache_key = PermissionService._cache_key(self.user.id)
        cache.delete(cache_key)

        perms = PermissionService.get_user_permissions(self.user)

        self.assertIn('ps_can_view_thing', perms)

    def test_invalidate_cache_removes_entry(self):
        from accounts.services.permission_service import PermissionService

        PermissionService.get_user_permissions(self.user)
        PermissionService.invalidate_cache(self.user.id)

        cache_key = PermissionService._cache_key(self.user.id)
        self.assertIsNone(cache.get(cache_key))

    # ── user_has_permission convenience ──────────────────────────────────────

    def test_user_has_permission_true_for_granted(self):
        from accounts.services.permission_service import PermissionService

        result = PermissionService.user_has_permission(self.user, 'ps_can_view_thing')

        self.assertTrue(result)

    def test_user_has_permission_false_for_ungranted(self):
        from accounts.services.permission_service import PermissionService

        result = PermissionService.user_has_permission(self.user, 'ps_can_delete_thing')

        self.assertFalse(result)
