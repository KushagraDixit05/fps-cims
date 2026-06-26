from django.urls import path
from .views import MeView, RegisterView, ResetPasswordView, LogoutView

urlpatterns = [
    path('me/', MeView.as_view(), name='user-me'),
    path('register/', RegisterView.as_view(), name='user-register'),
    # Phase 2: staff-only password reset that also blacklists existing sessions.
    path('reset-password/', ResetPasswordView.as_view(), name='user-reset-password'),
    # Phase 4: blacklist refresh token + emit audit log.
    path('logout/', LogoutView.as_view(), name='user-logout'),
]

