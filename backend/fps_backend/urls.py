"""
URL configuration for fps_backend project.
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.http import JsonResponse
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView, SpectacularRedocView
from rest_framework_simplejwt.views import TokenRefreshView
from accounts.token_serializers import CustomTokenObtainPairSerializer
from accounts.views_auth import AuditedTokenObtainPairView


def health(request):
    return JsonResponse({"status": "ok"})


urlpatterns = [
    path('health/', health, name='health'),

    # Django admin panel
    path('admin/', admin.site.urls),

    # --- Authentication ---
    path('api/auth/login/', AuditedTokenObtainPairView.as_view(serializer_class=CustomTokenObtainPairSerializer), name='token_obtain_pair'),
    path('api/auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/auth/', include('accounts.urls')),   # /api/auth/me/ + /api/auth/register/

    # --- App API routes ---
    path('api/', include('crops.urls')),
    path('api/', include('mandi.urls')),
    path('api/', include('product_demo.urls')),

    # --- Admin portal (field data viewing + CSV export) ---
    path('api/admin/', include('admin_portal.urls')),

    # --- Geo intelligence map ---
    path('api/geo/', include('geo.urls')),

    # --- Phase 3: Approval workflow (checker/mobile API) ---
    path('api/approvals/', include('workflow.urls')),

    # --- Phase 8: OpenAPI / Swagger docs (drf-spectacular) ---
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
]


# Serve uploaded media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
