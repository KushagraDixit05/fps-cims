from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.utils import timezone
from django.db.models import Count

from .models import ProductMaster, ProductDemo
from .serializers import (
    ProductMasterSerializer,
    ProductDemoCreateSerializer,
    ProductDemoListSerializer,
    ProductDemoDetailSerializer,
)
from accounts.permissions import HasFPSPermission


class ProductMasterViewSet(viewsets.ReadOnlyModelViewSet):
    """GET /api/product-master/ — list all active products."""
    queryset         = ProductMaster.objects.filter(is_active=True)
    serializer_class = ProductMasterSerializer
    permission_classes = [permissions.IsAuthenticated, HasFPSPermission]
    required_permission = 'can_access_product_demo_module'


class ProductDemoViewSet(viewsets.ModelViewSet):
    """CRUD for product demo entries. Scoped by permissions."""
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    permission_classes = [permissions.IsAuthenticated, HasFPSPermission]
    required_permission = 'can_access_product_demo_module'

    def get_queryset(self):
        user = self.request.user
        qs = ProductDemo.objects.select_related('executive').prefetch_related('photos')
        if not self.request.auth or not hasattr(self.request.auth, 'payload'):
            return qs.filter(executive=user)
        perms = self.request.auth.payload.get('perms', [])
        if 'can_view_all_demo_entries' in perms:
            return qs.all()
        if 'can_view_region_demo_entries' in perms:
            districts = self.request.auth.payload.get('districts', [])
            if districts:
                return qs.filter(district_name__in=districts)
        return qs.filter(executive=user)

    def get_serializer_class(self):
        if self.action == 'create':
            return ProductDemoCreateSerializer
        if self.action in ('retrieve',):
            return ProductDemoDetailSerializer
        return ProductDemoListSerializer

    def perform_create(self, serializer):
        serializer.save(executive=self.request.user)

    @action(detail=False, methods=['get'], url_path='summary')
    def summary(self, request):
        now = timezone.now()
        qs  = self.get_queryset()
        return Response({
            'today':      qs.filter(submitted_at__date=now.date()).count(),
            'this_week':  qs.filter(submitted_at__week=now.isocalendar()[1],
                                    submitted_at__year=now.year).count(),
            'this_month': qs.filter(submitted_at__month=now.month,
                                    submitted_at__year=now.year).count(),
        })
