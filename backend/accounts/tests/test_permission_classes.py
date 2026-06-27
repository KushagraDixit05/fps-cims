"""
accounts/tests/test_permission_classes.py
==========================================
Unit tests for DRF permission classes:

- IsAdminPortalUser: validates aud='fps-admin' in JWT (Phase 8)
- HasFPSPermission:  checks perms claim in JWT (Phase 2)

Tests use mock request objects with manually-set .user and .auth to avoid
needing a full Django HTTP cycle.
"""
from unittest.mock import MagicMock

from django.contrib.auth import get_user_model
from django.test import TestCase, RequestFactory, override_settings

User = get_user_model()


class MockToken(dict):
    """Dict subclass that also supports .get() — mimics simplejwt Token object."""
    pass


def _make_request(user=None, token_claims=None):
    """
    Build a minimal DRF-style request with user and auth set.

    Pass a real User instance for authenticated requests (is_authenticated
    is a read-only property that returns True for concrete user instances).
    Pass user=None for anonymous / unauthenticated scenarios.
    """
    factory = RequestFactory()
    request = factory.get('/')

    if token_claims is not None:
        request.auth = MockToken(token_claims)
    else:
        request.auth = None

    if user is not None:
        # Real User objects — is_authenticated is always True (read-only property)
        request.user = user
    else:
        # Simulate anonymous / unauthenticated request
        anon = MagicMock()
        anon.is_authenticated = False
        anon.__bool__ = lambda self: False
        request.user = anon

    return request


@override_settings(AUDIT_ENGINE_ENABLED=False)
class IsAdminPortalUserTest(TestCase):

    def setUp(self):
        self.user = User.objects.create_user(
            username='admin_cls_testuser',
            password='testpass123',
            is_staff=True,
        )

    def _permission(self):
        from admin_portal.permissions import IsAdminPortalUser
        return IsAdminPortalUser()

    def test_accepts_token_with_fps_admin_aud(self):
        request = _make_request(
            user=self.user,
            token_claims={'aud': 'fps-admin', 'user_id': self.user.pk},
        )
        self.assertTrue(self._permission().has_permission(request, None))

    def test_rejects_token_without_aud_claim(self):
        request = _make_request(
            user=self.user,
            token_claims={'user_id': self.user.pk},  # no aud
        )
        self.assertFalse(self._permission().has_permission(request, None))

    def test_rejects_token_with_wrong_aud(self):
        request = _make_request(
            user=self.user,
            token_claims={'aud': 'fps-mobile', 'user_id': self.user.pk},
        )
        self.assertFalse(self._permission().has_permission(request, None))

    def test_rejects_unauthenticated_request(self):
        # user=None → anonymous mock
        request = _make_request(user=None)
        self.assertFalse(self._permission().has_permission(request, None))

    def test_rejects_missing_auth_object(self):
        # token_claims=None → request.auth = None
        request = _make_request(user=self.user, token_claims=None)
        self.assertFalse(self._permission().has_permission(request, None))


@override_settings(
    CACHES={'default': {'BACKEND': 'django.core.cache.backends.locmem.LocMemCache'}},
    AUDIT_ENGINE_ENABLED=False,
)
class HasFPSPermissionTest(TestCase):

    def setUp(self):
        from accounts.models.permission import Permission
        from accounts.models.role import Role, RolePermission

        self.role = Role.objects.create(
            name='HFPSP Test Role',
            code='hfpsp_test_role',
            is_preset=False,
        )
        self.perm = Permission.objects.create(
            codename='hfpsp_can_do_thing',
            label='Do Thing',
            module='test_module',
            category='misc',
        )
        RolePermission.objects.create(role=self.role, permission=self.perm)

        self.user = User.objects.create_user(
            username='hfpsp_testuser',
            password='testpass123',
            primary_role=self.role,
        )

    def _make_view_with_perm(self, codename):
        view = MagicMock()
        view.required_permission = codename
        return view

    def test_accepts_user_with_required_perm_in_jwt(self):
        from accounts.permissions import HasFPSPermission

        request = _make_request(
            user=self.user,
            token_claims={'perms': ['hfpsp_can_do_thing']},
        )
        view = self._make_view_with_perm('hfpsp_can_do_thing')

        self.assertTrue(HasFPSPermission().has_permission(request, view))

    def test_rejects_user_for_permission_they_dont_have(self):
        from accounts.permissions import HasFPSPermission

        request = _make_request(
            user=self.user,
            token_claims={'perms': ['hfpsp_can_do_thing']},
        )
        # A codename that doesn't exist anywhere — neither in JWT nor in DB.
        view = self._make_view_with_perm('hfpsp_can_nonexistent_thing')

        self.assertFalse(HasFPSPermission().has_permission(request, view))
