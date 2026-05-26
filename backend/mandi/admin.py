from django.contrib import admin
from .models import Mandi, MandiArrival


@admin.register(Mandi)
class MandiAdmin(admin.ModelAdmin):
    list_display = ['name', 'district', 'state', 'is_active']
    list_filter = ['state', 'is_active']
    search_fields = ['name', 'district']
    list_editable = ['is_active']  # toggle active status directly in list view


class MandiArrivalInline(admin.TabularInline):
    """Show recent arrivals inline when viewing a Mandi."""
    model = MandiArrival
    extra = 0
    readonly_fields = ['id', 'created_at', 'submitted_by']
    fields = ['commodity', 'date', 'arrival_quantity', 'avg_rate', 'min_rate', 'max_rate', 'source', 'submitted_by']
    ordering = ['-date']
    max_num = 10  # show last 10 entries


@admin.register(MandiArrival)
class MandiArrivalAdmin(admin.ModelAdmin):
    list_display = [
        'mandi', 'commodity', 'date', 'arrival_quantity',
        'avg_rate', 'min_rate', 'max_rate', 'source', 'submitted_by'
    ]
    list_filter = ['mandi', 'commodity', 'source', 'date']
    search_fields = ['mandi__name', 'commodity']
    date_hierarchy = 'date'
    readonly_fields = ['id', 'created_at']
    raw_id_fields = ['mandi', 'submitted_by']
