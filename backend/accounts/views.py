from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken
from .serializers import UserProfileSerializer, RegisterSerializer


class MeView(APIView):
    """
    Returns the currently authenticated user's profile.
    GET /api/auth/me/
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = UserProfileSerializer(request.user)
        return Response(serializer.data)


class RegisterView(APIView):
    """
    Creates a new user account and returns a JWT token pair.
    Auto-login after registration — no separate login step required.
    POST /api/auth/register/

    Request body:
        username     (required)
        password     (required)
        password2    (required) — confirmation
        full_name    (optional) — split into first_name / last_name
        phone_number (optional)
        role         (optional, default: 'field_executive')
        region       (optional)
    """
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        user = serializer.save()

        # Issue JWT tokens immediately — auto-login
        refresh = RefreshToken.for_user(user)
        profile = UserProfileSerializer(user)

        return Response({
            'refresh': str(refresh),
            'access': str(refresh.access_token),
            'user': profile.data,
        }, status=status.HTTP_201_CREATED)


class ResetPasswordView(APIView):
    """
    Allows admin/staff users to set a new password for any user by ID.
    POST /api/auth/reset-password/

    Request body:
        user_id   (required) — ID of the target user
        password  (required) — new plain-text password (min 8 chars)

    Requires: is_staff or is_superuser.
    Invalidates all existing outstanding refresh tokens for the target user
    after the password change to force re-authentication.

    Phase 2 — Admin Portal APIs (Phase 5) will expose a dedicated admin
    endpoint; this lives in accounts/ so it can also be called from Django Admin.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        from django.contrib.auth import get_user_model
        from rest_framework_simplejwt.token_blacklist.models import (
            OutstandingToken, BlacklistedToken
        )

        if not (request.user.is_staff or request.user.is_superuser):
            return Response(
                {'detail': 'Admin access required.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        user_id = request.data.get('user_id')
        new_password = request.data.get('password', '')

        if not user_id:
            return Response({'detail': 'user_id is required.'}, status=status.HTTP_400_BAD_REQUEST)
        if len(str(new_password)) < 8:
            return Response(
                {'detail': 'Password must be at least 8 characters.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        User = get_user_model()
        try:
            target = User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return Response({'detail': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)

        target.set_password(new_password)
        target.save(update_fields=['password'])

        # Blacklist all outstanding refresh tokens for the target user so they
        # must re-authenticate with the new password.
        outstanding = OutstandingToken.objects.filter(user=target)
        for token in outstanding:
            BlacklistedToken.objects.get_or_create(token=token)

        return Response({
            'detail': f'Password reset for {target.username}. All sessions invalidated.',
        })
