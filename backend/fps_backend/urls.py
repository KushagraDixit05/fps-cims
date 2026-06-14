"""
URL configuration for fps_backend project.
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.http import JsonResponse
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from accounts.token_serializers import CustomTokenObtainPairSerializer


def health(request):
    return JsonResponse({"status": "ok"})


urlpatterns = [
    path('health/', health, name='health'),

    # Django admin panel
    path('admin/', admin.site.urls),

    # --- Authentication ---
    path('api/auth/login/', TokenObtainPairView.as_view(serializer_class=CustomTokenObtainPairSerializer), name='token_obtain_pair'),
    path('api/auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/auth/', include('accounts.urls')),   # /api/auth/me/ + /api/auth/register/

    # --- App API routes ---
    path('api/', include('crops.urls')),
    path('api/', include('mandi.urls')),
    path('api/', include('product_demo.urls')),

    # --- Admin portal (field data viewing + CSV export) ---
    path('api/admin/', include('admin_portal.urls')),
]


# Serve uploaded media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
