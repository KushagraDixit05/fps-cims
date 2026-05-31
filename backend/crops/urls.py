# /media/kushagra/crucial/FPS internship/fps/backend/crops/urls.py

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    VillageViewSet, FarmerViewSet, CropEntryViewSet,
    DistrictViewSet, BlockViewSet, CropMasterViewSet,
    FarmerVisitViewSet,
)

router = DefaultRouter()

# ── Existing routes (preserved) ──────────────────────────────────────────────
router.register(r'villages', VillageViewSet)
router.register(r'farmers', FarmerViewSet, basename='farmer')
router.register(r'crops', CropEntryViewSet, basename='crop')

# ── New Crop Monitoring routes ────────────────────────────────────────────────
router.register(r'districts', DistrictViewSet, basename='district')
router.register(r'blocks', BlockViewSet, basename='block')
router.register(r'crop-master', CropMasterViewSet, basename='crop-master')
router.register(r'farmer-visits', FarmerVisitViewSet, basename='farmer-visit')

urlpatterns = [
    path('', include(router.urls)),
]
