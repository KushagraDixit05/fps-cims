import logging

from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from accounts.permissions import OwnEntryOrCheckerPermission, permission_from_codename
from django_filters.rest_framework import DjangoFilterBackend
from django.db import IntegrityError
from django.db.models import Sum
from datetime import date

from .models import Mandi, MandiArrival
from .serializers import MandiSerializer, MandiArrivalSerializer

from audit.engine import AuditEngine

logger = logging.getLogger(__name__)


class MandiViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Read-only list of mandis for dropdowns and filtering.

    GET  /api/mandis/
    GET  /api/mandis/{id}/
    GET  /api/mandis/?search=guntur
    """
    queryset = Mandi.objects.filter(is_active=True)
    serializer_class = MandiSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, DjangoFilterBackend]
    filterset_fields = ['state', 'district']
    search_fields = ['name', 'district']


class MandiArrivalViewSet(viewsets.ModelViewSet):
    """
    CRUD for daily mandi arrival entries.
    submitted_by is auto-set from the authenticated user.

    GET    /api/mandi-arrivals/                              → list
    POST   /api/mandi-arrivals/                              → create
    GET    /api/mandi-arrivals/{id}/                         → retrieve
    PUT    /api/mandi-arrivals/{id}/                         → full update
    PATCH  /api/mandi-arrivals/{id}/                         → partial update
    GET    /api/mandi-arrivals/yoy_comparison/?mandi_id=1   → year-on-year comparison
    """
    serializer_class = MandiArrivalSerializer
    permission_classes = [IsAuthenticated]
    own_perm = "can_edit_own_mandi_arrival"
    any_perm = "can_edit_any_mandi_arrival"

    def get_permissions(self):
        if self.action == "create":
            return [IsAuthenticated(), permission_from_codename("can_create_mandi_arrival")()]
        if self.action in ("update", "partial_update"):
            return [IsAuthenticated(), OwnEntryOrCheckerPermission()]
        if self.action == "destroy":
            return [IsAuthenticated(), permission_from_codename("can_delete_mandi_arrival")()]
        return [IsAuthenticated()]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['mandi', 'date', 'commodity', 'source']
    ordering_fields = ['date', 'arrival_quantity', 'avg_rate']
    ordering = ['-date']

    def get_queryset(self):
        user = self.request.user
        qs = MandiArrival.objects.select_related('mandi', 'submitted_by')
        if user.is_staff or user.is_superuser:
            return qs.all()
        return qs.filter(submitted_by=user)

    def _approval_locked(self, instance):
        from mandi.serializers import _approval_is_locked
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
                request, event_type='mandi', action='arrival_updated', module='mandi',
                obj=self.get_object(),
                changes={k: request.data[k] for k in request.data if k not in ('local_id',)},
            )
        except Exception:
            logger.exception('MandiArrivalViewSet.update: audit log failed')
        return response

    def partial_update(self, request, *args, **kwargs):
        kwargs['partial'] = True
        return self.update(request, *args, **kwargs)

    def create(self, request, *args, **kwargs):
        # Idempotency layer 1: a retried offline sync (same client local_id) must
        # not create a duplicate. Return the already-stored record instead.
        local_id = request.data.get('local_id')
        if local_id:
            existing = MandiArrival.objects.filter(
                submitted_by=request.user, local_id=local_id
            ).first()
            if existing:
                serializer = self.get_serializer(existing)
                return Response(serializer.data, status=status.HTTP_200_OK)

        # Idempotency layer 2: natural-key reconciliation.
        existing = self._find_natural_key_match(request.data)
        if existing is not None:
            if local_id and not existing.local_id:
                existing.local_id = local_id
                existing.save(update_fields=['local_id'])
            serializer = self.get_serializer(existing)
            return Response(serializer.data, status=status.HTTP_200_OK)

        # Idempotency layer 3: race safety net.
        try:
            return super().create(request, *args, **kwargs)
        except IntegrityError:
            existing = self._find_natural_key_match(request.data)
            if existing is not None:
                serializer = self.get_serializer(existing)
                return Response(serializer.data, status=status.HTTP_200_OK)
            raise

    def _find_natural_key_match(self, data):
        """Return an existing MandiArrival matching the unique (mandi, date,
        commodity) tuple in the request payload, or None."""
        mandi = data.get('mandi')
        arrival_date = data.get('date')
        commodity = data.get('commodity')
        if not (mandi and arrival_date and commodity):
            return None
        return MandiArrival.objects.filter(
            mandi_id=mandi, date=arrival_date, commodity=commodity
        ).first()

    def perform_create(self, serializer):
        instance = serializer.save(submitted_by=self.request.user)
        try:
            AuditEngine.log(
                self.request, event_type='mandi', action='arrival_created', module='mandi',
                obj=instance,
            )
        except Exception:
            logger.exception('MandiArrivalViewSet.perform_create: audit log failed')

    def perform_destroy(self, instance):
        try:
            AuditEngine.log(
                self.request, event_type='mandi', action='arrival_deleted', module='mandi',
                obj=instance,
            )
        except Exception:
            logger.exception('MandiArrivalViewSet.perform_destroy: audit log failed')
        super().perform_destroy(instance)

    @action(detail=False, methods=['get'], url_path='yoy_comparison')
    def yoy_comparison(self, request):
        """
        Year-on-year arrival quantity comparison for a specific mandi.
        GET /api/mandi-arrivals/yoy_comparison/?mandi_id=1&commodity=Chili
        """
        mandi_id = request.query_params.get('mandi_id')
        commodity = request.query_params.get('commodity', 'Chili')

        if not mandi_id:
            return Response({'error': 'mandi_id query parameter is required.'}, status=400)

        this_year = date.today().year

        this_qs = MandiArrival.objects.filter(
            mandi_id=mandi_id,
            commodity=commodity,
            date__year=this_year
        )
        last_qs = MandiArrival.objects.filter(
            mandi_id=mandi_id,
            commodity=commodity,
            date__year=this_year - 1
        )

        return Response({
            'mandi_id': mandi_id,
            'commodity': commodity,
            'this_year': {
                'year': this_year,
                'total_quantity': this_qs.aggregate(total=Sum('arrival_quantity'))['total'],
                'entries': this_qs.count(),
            },
            'last_year': {
                'year': this_year - 1,
                'total_quantity': last_qs.aggregate(total=Sum('arrival_quantity'))['total'],
                'entries': last_qs.count(),
            },
        })
