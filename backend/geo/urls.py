from django.urls import path
from .views import AggregateView, PointsView, RecordView, RegionSummaryView, FlowsView, TimelineView, FacetsView

urlpatterns = [
    path('facets/', FacetsView.as_view(), name='geo-facets'),
    path('aggregate/', AggregateView.as_view(), name='geo-aggregate'),
    path('points/', PointsView.as_view(), name='geo-points'),
    path('record/<str:pk>/', RecordView.as_view(), name='geo-record'),
    path('region/<str:level>/<path:region_id>/summary/', RegionSummaryView.as_view(), name='geo-region-summary'),
    path('flows/', FlowsView.as_view(), name='geo-flows'),
    path('timeline/', TimelineView.as_view(), name='geo-timeline'),
]
