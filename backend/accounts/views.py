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

