"""
workflow/tests/test_approval_api.py
=====================================
API authorization tests for the approval workflow.

Tests cover:
- Unauthenticated requests are rejected (401)
- Admin portal endpoint rejected mobile tokens (no aud) → 403
- Admin portal endpoint accepts admin-scoped tokens (aud=fps-admin) → 200
"""
from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

User = get_user_model()

ADMIN_LOGIN_URL = '/api/admin/auth/login/'
ADMIN_APPROVALS_URL = '/api/admin/approvals/'
CHECKER_QUEUE_URL = '/api/approvals/queue/'


@override_settings(
    CACHES={'default': {'BACKEND': 'django.core.cache.backends.locmem.LocMemCache'}},
    AUDIT_ENGINE_ENABLED=False,
)
class ApprovalAPIAuthorizationTest(TestCase):

    def setUp(self):
        self.client = APIClient()

        self.staff_user = User.objects.create_user(
            username='aa_staff',
            password='StaffPass123!',
            is_staff=True,
        )
        self.field_user = User.objects.create_user(
            username='aa_field',
            password='FieldPass123!',
            is_staff=False,
        )

    def _get_mobile_token(self, username, password):
        resp = self.client.post(
            '/api/auth/login/',
            {'username': username, 'password': password},
            format='json',
        )
        return resp.json().get('access')

    def _get_admin_token(self, username, password):
        resp = self.client.post(
            ADMIN_LOGIN_URL,
            {'username': username, 'password': password},
            format='json',
        )
        return resp.json().get('access')

    # ── Unauthenticated ──────────────────────────────────────────────────────

    def test_unauthenticated_request_to_admin_approvals_returns_401(self):
        response = self.client.get(ADMIN_APPROVALS_URL)
        self.assertEqual(response.status_code, 401)

    def test_unauthenticated_request_to_checker_queue_returns_401(self):
        response = self.client.get(CHECKER_QUEUE_URL)
        self.assertEqual(response.status_code, 401)

    # ── Mobile token rejected on admin endpoints ─────────────────────────────

    def test_mobile_token_rejected_on_admin_approvals(self):
        """
        Staff user has a valid mobile token (no aud claim).
        IsAdminPortalUser must reject it on /api/admin/ endpoints.
        """
        mobile_token = self._get_mobile_token('aa_staff', 'StaffPass123!')
        self.assertIsNotNone(mobile_token)

        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {mobile_token}')
        response = self.client.get(ADMIN_APPROVALS_URL)

        self.assertEqual(response.status_code, 403)

    # ── Admin token accepted on admin endpoints ──────────────────────────────

    def test_admin_token_accepted_on_admin_approvals(self):
        admin_token = self._get_admin_token('aa_staff', 'StaffPass123!')
        self.assertIsNotNone(admin_token)

        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {admin_token}')
        response = self.client.get(ADMIN_APPROVALS_URL)

        # 200 (empty list) — not 401 or 403
        self.assertEqual(response.status_code, 200)

    # ── Checker queue accessible by any authenticated user ───────────────────

    def test_authenticated_field_user_can_access_checker_queue(self):
        """
        The checker queue is accessible to any authenticated user;
        it returns an empty list for non-checkers (no active approvals
        assigned to them).
        """
        mobile_token = self._get_mobile_token('aa_field', 'FieldPass123!')
        self.assertIsNotNone(mobile_token)

        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {mobile_token}')
        response = self.client.get(CHECKER_QUEUE_URL)

        self.assertIn(response.status_code, [200, 404])
