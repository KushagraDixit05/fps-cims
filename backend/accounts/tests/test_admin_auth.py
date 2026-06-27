"""
accounts/tests/test_admin_auth.py
==================================
Integration tests for the Phase 8 admin portal scoped authentication endpoint.

POST /api/admin/auth/login/
  - Staff users receive a JWT with aud='fps-admin'
  - Non-staff users are rejected (401/400)
  - The issued token is rejected by /api/admin/users/ (IsAdminPortalUser check)
  - A mobile token (no aud) is rejected by /api/admin/users/
"""
import json
import base64

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

User = get_user_model()

ADMIN_LOGIN_URL = '/api/admin/auth/login/'
ADMIN_USERS_URL = '/api/admin/users/'


def _decode_jwt_payload(token: str) -> dict:
    """Decode JWT payload without signature verification."""
    payload_b64 = token.split('.')[1]
    # Add padding
    padding = 4 - len(payload_b64) % 4
    if padding != 4:
        payload_b64 += '=' * padding
    return json.loads(base64.urlsafe_b64decode(payload_b64))


@override_settings(
    CACHES={'default': {'BACKEND': 'django.core.cache.backends.locmem.LocMemCache'}},
    AUDIT_ENGINE_ENABLED=False,
)
class AdminLoginEndpointTest(TestCase):

    def setUp(self):
        self.client = APIClient()

        self.staff_user = User.objects.create_user(
            username='admin_auth_staff',
            password='StaffPass123!',
            is_staff=True,
        )
        self.field_user = User.objects.create_user(
            username='admin_auth_field',
            password='FieldPass123!',
            is_staff=False,
        )

    def test_staff_user_receives_admin_scoped_token(self):
        response = self.client.post(
            ADMIN_LOGIN_URL,
            {'username': 'admin_auth_staff', 'password': 'StaffPass123!'},
            format='json',
        )

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn('access', data)

        payload = _decode_jwt_payload(data['access'])
        self.assertEqual(payload.get('aud'), 'fps-admin')

    def test_non_staff_user_is_rejected(self):
        response = self.client.post(
            ADMIN_LOGIN_URL,
            {'username': 'admin_auth_field', 'password': 'FieldPass123!'},
            format='json',
        )

        # Should return 401 (AuthenticationFailed from serializer)
        self.assertIn(response.status_code, [400, 401])

    def test_invalid_credentials_rejected(self):
        response = self.client.post(
            ADMIN_LOGIN_URL,
            {'username': 'admin_auth_staff', 'password': 'WrongPassword!'},
            format='json',
        )

        self.assertIn(response.status_code, [400, 401])

    def test_admin_token_accepted_on_admin_endpoint(self):
        # Login with staff user
        login_resp = self.client.post(
            ADMIN_LOGIN_URL,
            {'username': 'admin_auth_staff', 'password': 'StaffPass123!'},
            format='json',
        )
        self.assertEqual(login_resp.status_code, 200)
        access_token = login_resp.json()['access']

        # Use the token on an admin endpoint
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {access_token}')
        response = self.client.get(ADMIN_USERS_URL)

        self.assertNotEqual(response.status_code, 403)

    def test_mobile_token_rejected_on_admin_endpoint(self):
        """
        A token issued by /api/auth/login/ (no aud claim) must be rejected
        by IsAdminPortalUser even for a staff user.
        """
        # Get a mobile token (standard login, no aud)
        mobile_resp = self.client.post(
            '/api/auth/login/',
            {'username': 'admin_auth_staff', 'password': 'StaffPass123!'},
            format='json',
        )
        self.assertEqual(mobile_resp.status_code, 200)
        mobile_token = mobile_resp.json()['access']

        # Verify no aud in this token
        payload = _decode_jwt_payload(mobile_token)
        self.assertNotEqual(payload.get('aud'), 'fps-admin')

        # This token must be rejected on admin endpoints
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {mobile_token}')
        response = self.client.get(ADMIN_USERS_URL)

        self.assertEqual(response.status_code, 403)
