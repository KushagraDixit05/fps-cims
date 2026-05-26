from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import MandiViewSet, MandiArrivalViewSet

router = DefaultRouter()
router.register(r'mandis', MandiViewSet)
router.register(r'mandi-arrivals', MandiArrivalViewSet, basename='mandi-arrival')

urlpatterns = [
    path('', include(router.urls)),
]
