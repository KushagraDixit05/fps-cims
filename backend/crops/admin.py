from django.contrib import admin
from django.contrib.gis.admin import GISModelAdmin
from django.db.models import Sum
from .models import Village, Farmer, CropEntry, CropPhoto


@admin.register(Village)
class VillageAdmin(admin.ModelAdmin):
    list_display = ['name', 'taluka', 'district', 'state']
    search_fields = ['name', 'district', 'taluka']
    list_filter = ['state', 'district']


class CropPhotoInline(admin.TabularInline):
    """Inline photos displayed inside a CropEntry admin page."""
    model = CropPhoto
    extra = 0
    readonly_fields = ['uploaded_at']


@admin.register(CropEntry)
class CropEntryAdmin(GISModelAdmin):
    """
    GISModelAdmin gives a map widget for the location field.
    """
    list_display = [
        'farmer', 'visit_date', 'crop_name', 'crop_stage',
        'crop_condition', 'area_this_year', 'expected_yield', 'submitted_by'
    ]
    list_filter = [
        'crop_condition', 'crop_stage', 'crop_name',
        'visit_date', 'farmer__village__district'
    ]
    search_fields = ['farmer__name', 'farmer__village__name', 'farmer__village__district']
    date_hierarchy = 'visit_date'
    readonly_fields = ['id', 'created_at', 'updated_at']
    inlines = [CropPhotoInline]
    raw_id_fields = ['farmer', 'submitted_by']

    def changelist_view(self, request, extra_context=None):
        """Inject aggregate totals into the list view context."""
        extra_context = extra_context or {}
        qs = self.get_queryset(request)
        extra_context['total_acreage'] = qs.aggregate(Sum('area_this_year'))['area_this_year__sum'] or 0
        extra_context['total_entries'] = qs.count()
        return super().changelist_view(request, extra_context)


@admin.register(Farmer)
class FarmerAdmin(admin.ModelAdmin):
    list_display = ['name', 'phone_number', 'village', 'created_by', 'created_at']
    search_fields = ['name', 'phone_number', 'village__name']
    list_filter = ['village__district']
    raw_id_fields = ['village', 'created_by']
