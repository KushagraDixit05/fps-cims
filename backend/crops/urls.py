from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import VillageViewSet, FarmerViewSet, CropEntryViewSet

router = DefaultRouter()
router.register(r'villages', VillageViewSet)
router.register(r'farmers', FarmerViewSet, basename='farmer')
router.register(r'crops', CropEntryViewSet, basename='crop')

urlpatterns = [
    path('', include(router.urls)),
]
