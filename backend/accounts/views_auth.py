"""
accounts/views_auth.py
=======================
Audited login view for Phase 4.

Wraps simplejwt's TokenObtainPairView to emit AuditLog entries for
successful and failed login attempts without touching the token serializer
(which has no request context in get_token()).
"""
import logging

from django.contrib.auth import get_user_model
from rest_framework_simplejwt.views import TokenObtainPairView

from audit.engine import AuditEngine

logger = logging.getLogger(__name__)

User = get_user_model()


class AuditedTokenObtainPairView(TokenObtainPairView):
    """Drop-in replacement for TokenObtainPairView that logs login events."""

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
