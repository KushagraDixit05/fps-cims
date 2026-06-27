"""
accounts/token_serializers.py
==============================
Custom JWT token serializers for FPS.

CustomTokenObtainPairSerializer — mobile / field-executive login.
AdminTokenObtainPairSerializer  — admin portal login (Phase 8).

Claims added beyond the simplejwt defaults:
  role         — legacy coarse role string (backward compat for one sprint)
  role_id      — UUID of the user's primary_role FK (new RBAC canonical role)
  is_staff     — Django staff flag
  is_superuser — Django superuser flag
  email        — user email
  full_name    — display name
  state        — user's home state string
  districts    — list of district strings the user is assigned to
  perms        — sorted list of effective permission codenames (Phase 2 RBAC)
  aud          — 'fps-admin' on admin tokens; absent on mobile tokens (Phase 8)

See docs/rbac/02-PERMISSION-ENGINE.md §4 (JWT Permissions Embedding).
"""
from rest_framework_simplejwt.exceptions import AuthenticationFailed
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer, TokenRefreshSerializer
from rest_framework_simplejwt.tokens import AccessToken

from accounts.services.permission_service import PermissionService


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)

        # ── Backward-compat claims (kept for existing mobile clients) ──────
        token['role'] = user.role          # legacy CharField
        token['is_staff'] = user.is_staff
        token['is_superuser'] = user.is_superuser
        token['email'] = user.email or ''
        token['full_name'] = user.get_full_name() or user.username

        # ── Phase 2 RBAC claims ────────────────────────────────────────────
        token['role_id'] = str(user.primary_role_id) if user.primary_role_id else ''
        token['state'] = user.state or ''
        token['districts'] = user.districts or []

        # Resolve effective permission set (Redis cache → DB fallback).
        perms = PermissionService.get_user_permissions(user)
        token['perms'] = sorted(perms)  # sorted for deterministic comparison

        return token


class AdminTokenObtainPairSerializer(CustomTokenObtainPairSerializer):
    """
    Phase 8 — Admin portal login serializer.

    Extends the mobile serializer with two additions:
      1. Sets aud='fps-admin' so IsAdminPortalUser can distinguish admin
         tokens from mobile-issued tokens.
      2. Rejects non-staff users before issuing any token, so a field
         executive cannot obtain an admin-scoped JWT even by hitting this
         endpoint directly.
    """

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['aud'] = 'fps-admin'
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        if not (self.user.is_staff or self.user.is_superuser):
            raise AuthenticationFailed('Admin access required.')
        return data


class AdminTokenRefreshSerializer(TokenRefreshSerializer):
    """
    Token refresh serializer for the admin portal.

    simplejwt copies custom claims from the refresh token to the new access
    token, but does NOT copy `aud` because it is treated as a registered claim.
    This serializer explicitly re-stamps aud='fps-admin' so refreshed tokens
    remain valid for IsAdminPortalUser.
    """

    def validate(self, attrs):
        data = super().validate(attrs)
        # Decode the newly issued access token, add aud, re-encode.
        access = AccessToken(data['access'])
        access['aud'] = 'fps-admin'
        data['access'] = str(access)
        return data
