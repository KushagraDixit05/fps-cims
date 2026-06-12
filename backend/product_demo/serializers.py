from rest_framework import serializers
from django.contrib.gis.geos import Point
from .models import ProductMaster, ProductDemo, DemoPhoto


class ProductMasterSerializer(serializers.ModelSerializer):
    class Meta:
        model  = ProductMaster
        fields = ['id', 'name', 'category']


class DemoPhotoSerializer(serializers.ModelSerializer):
    class Meta:
        model  = DemoPhoto
        fields = ['id', 'image', 'photo_type', 'uploaded_at']


# ── Create ────────────────────────────────────────────────────────────────────

class AfterPhotoUploadSerializer(serializers.Serializer):
    photos_after = serializers.ListField(
        child=serializers.ImageField(), write_only=True, min_length=1,
    )


class ProductDemoCreateSerializer(serializers.ModelSerializer):
    # Photos submitted as separate multipart fields
    photos_before = serializers.ListField(
        child=serializers.ImageField(), write_only=True, required=False, default=list,
    )
    photos_after = serializers.ListField(
        child=serializers.ImageField(), write_only=True, required=False, default=list,
    )

    # GPS passed as flat fields; combined into PostGIS Point on save
    latitude  = serializers.FloatField(write_only=True, required=False, allow_null=True)
    longitude = serializers.FloatField(write_only=True, required=False, allow_null=True)

    class Meta:
        model  = ProductDemo
        fields = [
            'farmer_name', 'mobile_number', 'village_name', 'block_name',
            'district_name', 'total_land_acre',
            'crop_name', 'variety', 'crop_stage', 'crop_stage_days', 'demo_date',
            'product_name', 'dose', 'dose_unit',
            'demo_result', 'additional_observations', 'remark',
            'latitude', 'longitude',
            'local_id', 'photos_before', 'photos_after',
        ]

    def create(self, validated_data):
        photos_before = validated_data.pop('photos_before', [])
        photos_after  = validated_data.pop('photos_after',  [])
        lat = validated_data.pop('latitude',  None)
        lng = validated_data.pop('longitude', None)

        if lat is not None and lng is not None:
            validated_data['location']  = Point(lng, lat)
            validated_data['latitude']  = lat
            validated_data['longitude'] = lng

        validated_data['executive'] = self.context['request'].user
        validated_data['is_synced'] = True

        demo = ProductDemo.objects.create(**validated_data)

        for img in photos_before:
            DemoPhoto.objects.create(demo=demo, image=img, photo_type='before')
        for img in photos_after:
            DemoPhoto.objects.create(demo=demo, image=img, photo_type='after')

        return demo


# ── List ──────────────────────────────────────────────────────────────────────

class ProductDemoListSerializer(serializers.ModelSerializer):
    before_photo_count = serializers.SerializerMethodField()
    after_photo_count  = serializers.SerializerMethodField()

    class Meta:
        model  = ProductDemo
        fields = [
            'id', 'farmer_name', 'village_name', 'product_name',
            'demo_result', 'demo_date', 'submitted_at',
            'before_photo_count', 'after_photo_count',
            'local_id', 'is_synced',
        ]

    def get_before_photo_count(self, obj):
        return obj.photos.filter(photo_type='before').count()

    def get_after_photo_count(self, obj):
        return obj.photos.filter(photo_type='after').count()


# ── Detail ────────────────────────────────────────────────────────────────────

class ProductDemoDetailSerializer(serializers.ModelSerializer):
    photos = DemoPhotoSerializer(many=True, read_only=True)
    location_display = serializers.SerializerMethodField()

    class Meta:
        model  = ProductDemo
        fields = [
            'id', 'farmer_name', 'mobile_number', 'village_name', 'block_name',
            'district_name', 'total_land_acre',
            'crop_name', 'variety', 'crop_stage', 'crop_stage_days', 'demo_date',
            'product_name', 'dose', 'dose_unit',
            'demo_result', 'additional_observations', 'remark',
            'latitude', 'longitude', 'location_display',
            'photos', 'submitted_at', 'updated_at',
            'local_id', 'is_synced',
        ]

    def get_location_display(self, obj):
        if obj.latitude is not None and obj.longitude is not None:
            return f"{abs(obj.latitude):.4f}° N, {abs(obj.longitude):.4f}° E"
        return None
