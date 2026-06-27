"""
accounts/throttles.py
======================
Custom DRF throttle classes for the accounts app.

LoginRateThrottle limits unauthenticated login attempts to 5/minute per IP,
providing brute-force protection for both the mobile and admin login endpoints.
The 'login' scope is configured in REST_FRAMEWORK['DEFAULT_THROTTLE_RATES']
in fps_backend/settings.py.
"""
from rest_framework.throttling import AnonRateThrottle


class LoginRateThrottle(AnonRateThrottle):
    """5 login attempts per minute per IP address."""
    scope = 'login'
