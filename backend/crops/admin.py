# /media/kushagra/crucial/FPS internship/fps/backend/crops/admin.py

from django.contrib import admin
from django.contrib.gis.admin import GISModelAdmin
from django.db.models import Sum
from .models import (
    Village, Farmer, CropEntry, CropPhoto,
    District, Block, CropMaster, CropVariety,
    FarmerVisit, CropRecord, VisitPhoto,
    VillageMaster,
)


# ─────────────────────────────────────────────────────────────────────────────
# EXISTING ADMIN — PRESERVED UNCHANGED
# ─────────────────────────────────────────────────────────────────────────────

@admin.register(Village)
class VillageAdmin(admin.ModelAdmin):
    list_display = ['name', 'taluka', 'district', 'state']
    search_fields = ['name', 'district', 'taluka']
    list_filter = ['state', 'district']


class CropPhotoInline(admin.TabularInline):
    """Inline photos displayed inside a (legacy) CropEntry admin page."""
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


# ─────────────────────────────────────────────────────────────────────────────
# NEW ADMIN — CROP MONITORING MODULE
# ─────────────────────────────────────────────────────────────────────────────

class BlockInline(admin.TabularInline):
    model = Block
    extra = 1
    fields = ['name', 'is_active']


@admin.register(District)
class DistrictAdmin(admin.ModelAdmin):
    list_display = ['name', 'state', 'is_active', 'block_count']
    list_filter = ['state', 'is_active']
    search_fields = ['name', 'state']
    list_editable = ['is_active']
    inlines = [BlockInline]

    def block_count(self, obj: District) -> int:
        return obj.blocks.count()
    block_count.short_description = 'Blocks'


@admin.register(Block)
class BlockAdmin(admin.ModelAdmin):
    list_display = ['name', 'district', 'is_active', 'village_count']
    list_filter = ['district__state', 'district', 'is_active']
    search_fields = ['name', 'district__name']
    list_editable = ['is_active']
    raw_id_fields = ['district']

    def village_count(self, obj: Block) -> int:
        return obj.villages.count()
    village_count.short_description = 'Villages'


@admin.register(VillageMaster)
class VillageMasterAdmin(admin.ModelAdmin):
    list_display = ['name', 'block', 'district_name', 'is_active']
    list_filter = ['block__district__state', 'block__district', 'block', 'is_active']
    search_fields = ['name', 'block__name', 'block__district__name']
    list_editable = ['is_active']
    raw_id_fields = ['block']

    def district_name(self, obj: VillageMaster) -> str:
        return obj.block.district.name
    district_name.short_description = 'District'
    district_name.admin_order_field = 'block__district__name'


class CropVarietyInline(admin.TabularInline):
    model = CropVariety
    extra = 1
    fields = ['variety_name', 'is_active']


@admin.register(CropMaster)
class CropMasterAdmin(admin.ModelAdmin):
    list_display = ['crop_name', 'is_active', 'variety_count']
    list_filter = ['is_active']
    search_fields = ['crop_name']
    list_editable = ['is_active']
    inlines = [CropVarietyInline]

    def variety_count(self, obj: CropMaster) -> int:
        return obj.varieties.count()
    variety_count.short_description = 'Varieties'


class CropRecordInline(admin.TabularInline):
    model = CropRecord
    extra = 0
    readonly_fields = ['id']
    fields = [
        'crop_name', 'variety', 'date_of_sowing',
        'current_area_acre', 'this_year_area_acre',
        'crop_stage', 'crop_condition', 'problems', 'sort_order',
    ]


class VisitPhotoInline(admin.TabularInline):
    model = VisitPhoto
    extra = 0
    readonly_fields = ['id', 'uploaded_at']
    fields = ['image', 'uploaded_at']


@admin.register(FarmerVisit)
class FarmerVisitAdmin(GISModelAdmin):
    list_display = [
        'farmer_name', 'mobile_number', 'village_name', 'block_name',
        'district_name', 'crop_count_display', 'executive', 'submitted_at',
    ]
    list_filter = ['district_name', 'submitted_at', 'is_synced']
    search_fields = ['farmer_name', 'mobile_number', 'village_name', 'block_name', 'district_name']
    date_hierarchy = 'submitted_at'
    readonly_fields = ['id', 'submitted_at', 'updated_at', 'location']
    raw_id_fields = ['executive']
    inlines = [CropRecordInline, VisitPhotoInline]

    def crop_count_display(self, obj: FarmerVisit) -> int:
        return obj.crops.count()
    crop_count_display.short_description = 'Crops'
