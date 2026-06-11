import json
import base64
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from accounts.models import User, Role, Permission, RolePermission, UserPermission
from accounts.services.permission_service import PermissionService


def _create_role(code):
    return Role.objects.get_or_create(code=code, defaults={'name': code, 'is_preset': True})[0]


def _create_permission(codename, module='crops'):
    return Permission.objects.get_or_create(
        codename=codename,
        defaults={'label': codename, 'module': module, 'category': 'action'},
    )[0]


def _assign_perm(role, perm, granted_by):
    RolePermission.objects.get_or_create(role=role, permission=perm, defaults={'granted_by': granted_by})


class FieldExecutivePermissionsTest(TestCase):
    def setUp(self):
        self.role = _create_role('field_executive')
        self.perm = _create_permission('can_create_crop_visit')
        superuser = User.objects.create_superuser('su', 'su@fps.in', 'pass')
        _assign_perm(self.role, self.perm, superuser)
        self.user = User.objects.create_user('fe1', 'fe1@fps.in', 'pass', primary_role=self.role)

    def test_field_executive_has_crop_create(self):
        perms = PermissionService.get_user_permissions(self.user)
        self.assertIn('can_create_crop_visit', perms)


class CheckerPermissionsTest(TestCase):
    def setUp(self):
        self.role = _create_role('checker')
        self.perm = _create_permission('can_approve_crop_visit', module='crops')
        superuser = User.objects.create_superuser('su2', 'su2@fps.in', 'pass')
        _assign_perm(self.role, self.perm, superuser)
        self.user = User.objects.create_user('chk1', 'chk1@fps.in', 'pass', primary_role=self.role)

    def test_checker_has_approve_crop_visit(self):
        perms = PermissionService.get_user_permissions(self.user)
        self.assertIn('can_approve_crop_visit', perms)


class DenyOverrideTest(TestCase):
    def setUp(self):
        self.role = _create_role('field_executive_deny')
        self.perm = _create_permission('can_view_reports', module='reports')
        superuser = User.objects.create_superuser('su3', 'su3@fps.in', 'pass')
        _assign_perm(self.role, self.perm, superuser)
        self.user = User.objects.create_user('fe2', 'fe2@fps.in', 'pass', primary_role=self.role)
        # Add deny override
        UserPermission.objects.create(
            user=self.user,
            permission=self.perm,
            effect='deny',
            granted_by=superuser,
        )

    def test_deny_override_removes_perm(self):
        perms = PermissionService.get_user_permissions(self.user)
        self.assertNotIn('can_view_reports', perms)


class JWTPermsClaimTest(TestCase):
    def setUp(self):
        self.role = _create_role('field_executive_jwt')
        self.perm = _create_permission('can_create_mandi_arrival', module='mandi')
        superuser = User.objects.create_superuser('su4', 'su4@fps.in', 'pass')
        _assign_perm(self.role, self.perm, superuser)
        self.user = User.objects.create_user('fe3', 'fe3@fps.in', 'pass', primary_role=self.role)
        self.client = APIClient()

    def test_jwt_contains_perms_array(self):
        url = reverse('token_obtain_pair')
        resp = self.client.post(url, {'username': 'fe3', 'password': 'pass'}, format='json')
        self.assertEqual(resp.status_code, 200)
        access = resp.data['access']
        payload_b64 = access.split('.')[1]
        padding = 4 - len(payload_b64) % 4
        payload = json.loads(base64.urlsafe_b64decode(payload_b64 + '=' * padding))
        self.assertIn('perms', payload)
        self.assertIsInstance(payload['perms'], list)
        self.assertIn('can_create_mandi_arrival', payload['perms'])


class PermissionGate403Test(TestCase):
    def setUp(self):
        fe_role = _create_role('field_executive_gate')
        self.fe_user = User.objects.create_user('fe4', 'fe4@fps.in', 'pass', primary_role=fe_role)
        self.client = APIClient()

    def test_fe_cannot_access_checker_only_endpoint(self):
        url = reverse('token_obtain_pair')
        resp = self.client.post(url, {'username': 'fe4', 'password': 'pass'}, format='json')
        self.assertEqual(resp.status_code, 200)
        token = resp.data['access']
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        # Approval queue requires can_approve_* permission
        resp2 = self.client.get('/api/approvals/queue/')
        self.assertEqual(resp2.status_code, 403)
