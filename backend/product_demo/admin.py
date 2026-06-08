from django.contrib import admin
from .models import ProductMaster, ProductDemo, DemoPhoto


@admin.register(ProductMaster)
class ProductMasterAdmin(admin.ModelAdmin):
    list_display  = ['name', 'category', 'is_active']
    list_filter   = ['is_active', 'category']
    search_fields = ['name']


class DemoPhotoInline(admin.TabularInline):
    model  = DemoPhoto
    extra  = 0
    fields = ['image', 'photo_type', 'uploaded_at']
    readonly_fields = ['uploaded_at']


@admin.register(ProductDemo)
class ProductDemoAdmin(admin.ModelAdmin):
    list_display   = [
        'farmer_name', 'product_name', 'demo_result', 'demo_date',
        'district_name', 'submitted_at', 'is_synced',
    ]
    list_filter    = ['demo_result', 'crop_stage', 'district_name', 'is_synced']
    search_fields  = ['farmer_name', 'product_name', 'village_name', 'district_name']
    readonly_fields = ['submitted_at', 'updated_at', 'id']
    inlines        = [DemoPhotoInline]
    date_hierarchy = 'demo_date'
