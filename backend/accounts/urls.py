from django.urls import path
from .views import MeView, RegisterView, ResetPasswordView

urlpatterns = [
    path('me/', MeView.as_view(), name='user-me'),
    path('register/', RegisterView.as_view(), name='user-register'),
    # Phase 2: staff-only password reset that also blacklists existing sessions.
    path('reset-password/', ResetPasswordView.as_view(), name='user-reset-password'),
]

