"""
accounts/views_auth.py
=======================
Audited login views for Phase 4 + Phase 8.

AuditedTokenObtainPairView — mobile login, emits audit log entries.
AdminTokenObtainPairView   — admin portal login (aud: fps-admin, Phase 8).
"""
import logging

from django.contrib.auth import get_user_model
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from accounts.throttles import LoginRateThrottle
from accounts.token_serializers import AdminTokenObtainPairSerializer, AdminTokenRefreshSerializer
from audit.engine import AuditEngine

logger = logging.getLogger(__name__)

User = get_user_model()


class AuditedTokenObtainPairView(TokenObtainPairView):
    """Drop-in replacement for TokenObtainPairView that logs login events."""

    throttle_classes = [LoginRateThrottle]

    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)

        try:
            username = request.data.get('username', '') or ''

            if response.status_code == 200:
                # Successful login — resolve the user for audit context.
                user = User.objects.filter(username=username).first()
                AuditEngine.log(
                    request,
                    event_type='user',
                    action='login',
                    module='accounts',
                    obj=user,
                    actor_override=user,
                )
            else:
                # Failed login — actor is unknown; store attempted username.
                AuditEngine.log(
                    request,
                    event_type='user',
                    action='login_failed',
                    module='accounts',
                    changes={'username': username},
                )
        except Exception:
            logger.exception('AuditedTokenObtainPairView: audit log failed')

        return response


class AdminTokenObtainPairView(AuditedTokenObtainPairView):
    """
    Phase 8 — Admin portal login endpoint.

    Issues tokens with aud='fps-admin' (via AdminTokenObtainPairSerializer).
    Rejects non-staff users in the serializer before a token is issued.
    Registered at POST /api/admin/auth/login/.
    """

    serializer_class = AdminTokenObtainPairSerializer


class AdminTokenRefreshView(TokenRefreshView):
    """
    Token refresh endpoint for the admin portal.

    Re-stamps aud='fps-admin' on the new access token so IsAdminPortalUser
    continues to accept it after refresh.  Registered at
    POST /api/admin/auth/refresh/.
    """

    serializer_class = AdminTokenRefreshSerializer
