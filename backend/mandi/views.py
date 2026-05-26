from rest_framework import viewsets, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Sum
from datetime import date

from .models import Mandi, MandiArrival
from .serializers import MandiSerializer, MandiArrivalSerializer


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
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['mandi', 'date', 'commodity', 'source']
    ordering_fields = ['date', 'arrival_quantity', 'avg_rate']
    ordering = ['-date']

    def get_queryset(self):
        return MandiArrival.objects.select_related('mandi', 'submitted_by').all()

    def perform_create(self, serializer):
        serializer.save(submitted_by=self.request.user)

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
