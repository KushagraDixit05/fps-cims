from rest_framework import viewsets, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Sum, Count

from .models import Village, Farmer, CropEntry
from .serializers import VillageSerializer, FarmerSerializer, CropEntrySerializer


class VillageViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Read-only list of villages.
    Used to populate location dropdowns in the mobile app.

    GET  /api/villages/
    GET  /api/villages/{id}/
    GET  /api/villages/?search=devgaon
    """
    queryset = Village.objects.all()
    serializer_class = VillageSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter]
    search_fields = ['name', 'district', 'taluka']


class FarmerViewSet(viewsets.ModelViewSet):
    """
    CRUD for farmers.
    Field executives can register new farmers and view their own.
    Admins see all farmers.

    GET  /api/farmers/
    POST /api/farmers/
    GET  /api/farmers/{id}/
    """
    serializer_class = FarmerSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['village__district', 'village']
    search_fields = ['name', 'phone_number', 'village__name']

    def get_queryset(self):
        user = self.request.user
        if user.role == 'admin':
            return Farmer.objects.select_related('village', 'created_by').all()
        return Farmer.objects.filter(created_by=user).select_related('village')

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class CropEntryViewSet(viewsets.ModelViewSet):
    """
    CRUD for crop entries (field visits).

    - Field executives: see only their own submissions.
    - Admins: see all entries.

    GET    /api/crops/               → list
    POST   /api/crops/               → create
    GET    /api/crops/{id}/          → retrieve
    PUT    /api/crops/{id}/          → full update
    PATCH  /api/crops/{id}/          → partial update
    DELETE /api/crops/{id}/          → delete
    GET    /api/crops/summary/       → aggregate dashboard stats
    """
    serializer_class = CropEntrySerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['crop_condition', 'crop_stage', 'farmer__village__district', 'crop_name']
    ordering_fields = ['visit_date', 'created_at', 'area_this_year']
    ordering = ['-visit_date']

    def get_queryset(self):
        user = self.request.user
        base_qs = CropEntry.objects.select_related(
            'farmer', 'farmer__village'
        ).prefetch_related('photos')

        if user.role == 'admin':
            return base_qs.all()
        # Field executives see only their own submissions
        return base_qs.filter(submitted_by=user)

    @action(detail=False, methods=['get'], url_path='summary')
    def summary(self, request):
        """
        Aggregate statistics for the dashboard.
        GET /api/crops/summary/
        """
        qs = self.get_queryset()

        by_condition = {
            cond: qs.filter(crop_condition=cond).count()
            for cond, _ in CropEntry.CONDITION_CHOICES
        }
        by_stage = {
            stage: qs.filter(crop_stage=stage).count()
            for stage, _ in CropEntry.CROP_STAGE_CHOICES
        }

        return Response({
            'total_entries': qs.count(),
            'total_acreage': qs.aggregate(Sum('area_this_year'))['area_this_year__sum'],
            'by_condition': by_condition,
            'by_stage': by_stage,
        })
