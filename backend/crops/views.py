# /media/kushagra/crucial/FPS internship/fps/backend/crops/views.py

from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Sum, Count

from fps_backend.pagination import MobilePagination
from django.utils import timezone
from datetime import timedelta

from .models import (
    Village, Farmer, CropEntry,
    District, Block, CropMaster,
    FarmerVisit, VillageMaster,
)
from .serializers import (
    VillageSerializer, FarmerSerializer, CropEntrySerializer,
    DistrictSerializer, BlockSerializer, CropMasterSerializer,
    VillageMasterSerializer,
    FarmerVisitCreateSerializer, FarmerVisitListSerializer,
    FarmerVisitDetailSerializer,
)


# ─────────────────────────────────────────────────────────────────────────────
# EXISTING VIEWSETS — PRESERVED UNCHANGED
# ─────────────────────────────────────────────────────────────────────────────

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
        if user.is_staff or user.is_superuser:
            return Farmer.objects.select_related('village', 'created_by').all()
        return Farmer.objects.filter(created_by=user).select_related('village')

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class CropEntryViewSet(viewsets.ModelViewSet):
    """
    CRUD for (legacy) crop entries (field visits).

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

        if user.is_staff or user.is_superuser:
            return base_qs.all()
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


# ─────────────────────────────────────────────────────────────────────────────
# NEW VIEWSETS — CROP MONITORING MODULE
# ─────────────────────────────────────────────────────────────────────────────

class DistrictViewSet(viewsets.ReadOnlyModelViewSet):
    """
    GET /api/districts/        → full district list
    GET /api/districts/{id}/   → single district
    """
    queryset = District.objects.filter(is_active=True)
    serializer_class = DistrictSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter]
    search_fields = ['name', 'state']


class BlockViewSet(viewsets.ReadOnlyModelViewSet):
    """
    GET /api/blocks/                     → all blocks
    GET /api/blocks/?district=<id>       → blocks for a given district ID
    GET /api/blocks/?search=<name>       → search by name
    """
    serializer_class = BlockSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['district']
    search_fields = ['name', 'district__name']

    def get_queryset(self):
        return Block.objects.filter(is_active=True).select_related('district')


class VillageMasterViewSet(viewsets.ReadOnlyModelViewSet):
    """
    GET /api/village-master/                      → all active villages
    GET /api/village-master/?block=<id>           → villages for a given block ID
    GET /api/village-master/?search=<name>        → search by village name
    """
    serializer_class = VillageMasterSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['block']
    search_fields = ['name', 'block__name', 'block__district__name']

    def get_queryset(self):
        return VillageMaster.objects.filter(is_active=True).select_related('block', 'block__district')


class CropMasterViewSet(viewsets.ReadOnlyModelViewSet):
    """
    GET /api/crop-master/      → all crops with nested varieties
    GET /api/crop-master/{id}/ → single crop with varieties
    """
    queryset = CropMaster.objects.filter(is_active=True).prefetch_related('varieties')
    serializer_class = CropMasterSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter]
    search_fields = ['crop_name']


class FarmerVisitViewSet(viewsets.ModelViewSet):
    """
    Full CRUD for farmer visits (new Crop Monitoring module).

    POST   /api/farmer-visits/           → submit new visit (multipart/form-data)
    GET    /api/farmer-visits/           → list visits for current executive
    GET    /api/farmer-visits/{uuid}/    → visit detail
    PATCH  /api/farmer-visits/{uuid}/    → partial update (for EDIT from Review screen)
    GET    /api/farmer-visits/summary/   → dashboard counts (today/week/month/team)
    """
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    pagination_class = MobilePagination
    filter_backends = [filters.OrderingFilter, filters.SearchFilter]
    ordering_fields = ['submitted_at']
    ordering = ['-submitted_at']
    search_fields = ['farmer_name', 'village_name', 'block_name', 'district_name']

    def get_queryset(self):
        user = self.request.user
        base_qs = FarmerVisit.objects.prefetch_related('crops', 'photos')
        if user.is_staff or user.is_superuser:
            return base_qs.all()
        return base_qs.filter(executive=user)

    def get_serializer_class(self):
        if self.action == 'create':
            return FarmerVisitCreateSerializer
        if self.action in ('retrieve', 'update', 'partial_update'):
            return FarmerVisitDetailSerializer
        return FarmerVisitListSerializer

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context

    def create(self, request, *args, **kwargs):
        # Idempotency: a retried offline sync (same client local_id) returns the
        # already-stored visit instead of creating a duplicate.
        local_id = request.data.get('local_id')
        if local_id:
            existing = FarmerVisit.objects.filter(
                executive=request.user, local_id=local_id
            ).first()
            if existing:
                return Response(
                    {
                        'id': str(existing.id),
                        'submitted_at': existing.submitted_at.isoformat(),
                        'farmer_name': existing.farmer_name,
                        'crop_count': existing.crop_count,
                        'location': {'lat': existing.latitude, 'lng': existing.longitude},
                    },
                    status=status.HTTP_200_OK,
                )

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        visit = serializer.save()

        # Return lightweight response on 201
        return Response(
            {
                'id': str(visit.id),
                'submitted_at': visit.submitted_at.isoformat(),
                'farmer_name': visit.farmer_name,
                'crop_count': visit.crop_count,
                'location': {
                    'lat': visit.latitude,
                    'lng': visit.longitude,
                },
            },
            status=status.HTTP_201_CREATED,
        )

    @action(detail=False, methods=['get'], url_path='summary')
    def summary(self, request):
        """
        Dashboard counts for the current executive.
        GET /api/farmer-visits/summary/
        """
        qs = self.get_queryset()
        now = timezone.now()
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        week_start = today_start - timedelta(days=now.weekday())
        month_start = today_start.replace(day=1)

        return Response({
            'today': qs.filter(submitted_at__gte=today_start).count(),
            'this_week': qs.filter(submitted_at__gte=week_start).count(),
            'this_month': qs.filter(submitted_at__gte=month_start).count(),
            'team_members': FarmerVisit.objects.values('executive').distinct().count(),
        })
