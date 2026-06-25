"""
accounts/token_serializers.py
==============================
Custom JWT token serializer for FPS (Phase 2).

Claims added beyond the simplejwt defaults:
  role         — legacy coarse role string (backward compat for one sprint)
  role_id      — UUID of the user's primary_role FK (new RBAC canonical role)
  is_staff     — Django staff flag (used by admin portal IsStaffUser guard)
  is_superuser — Django superuser flag
  email        — user email
  full_name    — display name
  state        — user's home state string
  districts    — list of district strings the user is assigned to
  perms        — sorted list of effective permission codenames (Phase 2 RBAC)

The ``perms`` claim is resolved via PermissionService which reads from Redis
(TTL 300s) and falls back to a DB lookup.  Sorting ensures a deterministic
payload for easy client-side comparison.

See docs/rbac/02-PERMISSION-ENGINE.md §4 (JWT Permissions Embedding).
"""
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

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
