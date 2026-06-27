import logging

from rest_framework import viewsets, permissions, status
from accounts.permissions import OwnEntryOrCheckerPermission, permission_from_codename
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.db import transaction, IntegrityError
from django.utils import timezone
from fps_backend.pagination import MobilePagination
from .models import ProductMaster, ProductDemo, DemoPhoto
from .serializers import (
    ProductMasterSerializer,
    ProductDemoCreateSerializer,
    ProductDemoListSerializer,
    ProductDemoDetailSerializer,
    AfterPhotoUploadSerializer,
    ProductDemoAfterUpdateSerializer,
)

from audit.engine import AuditEngine

logger = logging.getLogger(__name__)


class ProductMasterViewSet(viewsets.ReadOnlyModelViewSet):
    """GET /api/product-master/ — list all active products."""
    queryset         = ProductMaster.objects.filter(is_active=True)
    serializer_class = ProductMasterSerializer
    permission_classes = [permissions.IsAuthenticated]


class ProductDemoViewSet(viewsets.ModelViewSet):
    """CRUD for product demo entries. Field executives see only their own records."""
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    permission_classes = [permissions.IsAuthenticated]
    own_perm = "can_edit_own_product_demo"
    any_perm = "can_edit_any_product_demo"

    def get_permissions(self):
        if self.action == "create":
            return [permissions.IsAuthenticated(), permission_from_codename("can_create_product_demo")()]
        if self.action in ("update", "partial_update"):
            return [permissions.IsAuthenticated(), OwnEntryOrCheckerPermission()]
        if self.action == "destroy":
            return [permissions.IsAuthenticated(), permission_from_codename("can_delete_product_demo")()]
        return [permissions.IsAuthenticated()]
    pagination_class = MobilePagination

    def get_queryset(self):
        user = self.request.user
        qs = ProductDemo.objects.select_related('executive').prefetch_related('photos')
        if user.is_staff or user.is_superuser:
            return qs.all()
        return qs.filter(executive=user)

    def get_serializer_class(self):
        if self.action == 'create':
            return ProductDemoCreateSerializer
        if self.action in ('retrieve',):
            return ProductDemoDetailSerializer
        return ProductDemoListSerializer

    def _approval_locked(self, instance):
        from product_demo.serializers import _approval_is_locked
        return _approval_is_locked(instance)

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        if self._approval_locked(instance):
            return Response(
                {'detail': 'Record is locked pending approval.'},
                status=status.HTTP_423_LOCKED,
            )
        response = super().update(request, *args, **kwargs)
        try:
            AuditEngine.log(
                request, event_type='demo', action='updated', module='product_demo',
                obj=self.get_object(),
                changes={k: request.data[k] for k in request.data if k not in ('photos_before', 'photos_after')},
            )
        except Exception:
            logger.exception('ProductDemoViewSet.update: audit log failed')
        return response

    def partial_update(self, request, *args, **kwargs):
        kwargs['partial'] = True
        return self.update(request, *args, **kwargs)

    def create(self, request, *args, **kwargs):
        # Idempotency: a retried offline sync (same client local_id) returns the
        # already-stored record instead of creating a duplicate.
        local_id = request.data.get('local_id')
        if local_id:
            existing = ProductDemo.objects.filter(
                executive=request.user, local_id=local_id
            ).first()
            if existing:
                return Response({'id': str(existing.id)}, status=status.HTTP_200_OK)

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            demo = serializer.save()
        except IntegrityError:
            # Race safety net: a concurrent retry with the same local_id won the
            # INSERT past the guard above. Reconcile to the existing record.
            existing = ProductDemo.objects.filter(
                executive=request.user, local_id=local_id
            ).first() if local_id else None
            if existing is not None:
                return Response({'id': str(existing.id)}, status=status.HTTP_200_OK)
            raise

        # Phase 4: log the new demo creation.
        try:
            AuditEngine.log(
                request, event_type='demo', action='created', module='product_demo', obj=demo,
            )
        except Exception:
            logger.exception('ProductDemoViewSet.create: audit log failed')

        return Response({'id': str(demo.id)}, status=status.HTTP_201_CREATED)

    def perform_destroy(self, instance):
        try:
            AuditEngine.log(
                self.request, event_type='demo', action='deleted', module='product_demo',
                obj=instance,
            )
        except Exception:
            logger.exception('ProductDemoViewSet.perform_destroy: audit log failed')
        super().perform_destroy(instance)

    @action(detail=True, methods=['post'], url_path='complete-after',
            parser_classes=[MultiPartParser, FormParser])
    def complete_after(self, request, pk=None):
        """
        POST /api/product-demos/{id}/complete-after/ — deferred After update.

        Records the demo result + after-photos + observations/remark and marks
        the demo completed. Only these fields are writable (immutability guard).
        """
        demo = self.get_object()
        serializer = ProductDemoAfterUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        # Idempotent + atomic: a retried offline sync (client timed out after the
        # server already completed) must not duplicate after-photos. Replace the
        # existing 'after' set rather than appending, all within one transaction.
        with transaction.atomic():
            demo.photos.filter(photo_type='after').delete()
            for img in data['photos_after']:
                DemoPhoto.objects.create(demo=demo, image=img, photo_type='after')

            demo.demo_result             = data['demo_result']
            demo.additional_observations = data.get('additional_observations', '')
            demo.remark                  = data.get('remark', '')
            demo.demo_phase              = 'completed'
            demo.save(update_fields=[
                'demo_result', 'additional_observations', 'remark',
                'demo_phase', 'updated_at',
            ])

        return Response({
            'demo_phase':        demo.demo_phase,
            'after_photo_count': demo.photos.filter(photo_type='after').count(),
        })

    @action(detail=True, methods=['post'], url_path='after-photos',
            parser_classes=[MultiPartParser, FormParser])
    def upload_after_photos(self, request, pk=None):
        """POST /api/product-demos/{id}/after-photos/ — legacy after-photo append (kept for compat)."""
        demo = self.get_object()
        serializer = AfterPhotoUploadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        for img in serializer.validated_data['photos_after']:
            DemoPhoto.objects.create(demo=demo, image=img, photo_type='after')
        return Response({'after_photo_count': demo.photos.filter(photo_type='after').count()})

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
