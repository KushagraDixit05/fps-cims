import json
import logging
from rest_framework import serializers
from django.contrib.gis.geos import Point
from django.db import transaction
from .models import ProductMaster, ProductDemo, DemoPhoto

logger = logging.getLogger('fps.custom_values')


def _approval_is_locked(instance):
    from django.contrib.contenttypes.models import ContentType
    try:
        from workflow.models import ApprovalInstance
        ct = ContentType.objects.get_for_model(instance)
        return ApprovalInstance.objects.filter(
            content_type=ct, object_id=instance.pk
        ).exclude(status__in=['draft', 'cancelled', 'revision_requested']).exists()
    except Exception:
        return False


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


class ProductDemoAfterUpdateSerializer(serializers.Serializer):
    """
    Writable fields for the deferred 'After' update only.

    Setup fields (farmer, crop, varieties, product, dose, before-photos) are
    deliberately absent — this serializer is the immutability guard, so a
    buggy/malicious client cannot mutate locked historical data.
    """
    demo_result             = serializers.ChoiceField(choices=ProductDemo.DEMO_RESULT_CHOICES)
    additional_observations = serializers.CharField(required=False, allow_blank=True, default='')
    remark                  = serializers.CharField(required=False, allow_blank=True, default='')
    photos_after            = serializers.ListField(
        child=serializers.ImageField(), write_only=True, min_length=1,
    )


class ProductDemoCreateSerializer(serializers.ModelSerializer):
    # 'Before' submission: setup + before-photos only. Result/after-photos are
    # captured later via the deferred After update.
    photos_before = serializers.ListField(
        child=serializers.ImageField(), write_only=True, required=False, default=list,
    )

    # GPS passed as flat fields; combined into PostGIS Point on save
    latitude  = serializers.FloatField(write_only=True, required=False, allow_null=True)
    longitude = serializers.FloatField(write_only=True, required=False, allow_null=True)

    # Multiple varieties of the one crop. Arrives JSON-encoded in multipart
    # (standard FormData workaround), e.g. '["JS 9560", "NRC 37"]'.
    varieties = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model  = ProductDemo
        fields = [
            'farmer_name', 'mobile_number', 'village_name', 'block_name',
            'district_name', 'total_land_acre',
            'crop_name', 'variety', 'varieties', 'crop_stage', 'crop_stage_days', 'demo_date',
            'product_name', 'dose', 'dose_unit',
            'latitude', 'longitude',
            'local_id', 'photos_before',
        ]

    def validate_product_name(self, value: str) -> str:
        v = value.strip()[:200]
        if not v:
            raise serializers.ValidationError('Product name is required.')
        return v

    def validate_crop_name(self, value: str) -> str:
        v = value.strip()[:100]
        if not v:
            raise serializers.ValidationError('Crop name is required.')
        return v

    def validate_block_name(self, value: str) -> str:
        return value.strip()[:200]

    def validate_varieties(self, value):
        """Parse the JSON-encoded varieties list into a clean list of names."""
        if not value:
            return []
        try:
            parsed = json.loads(value)
        except (ValueError, TypeError):
            raise serializers.ValidationError('varieties must be a valid JSON array.')
        if not isinstance(parsed, list):
            raise serializers.ValidationError('varieties must be a JSON array.')
        names = [str(v).strip() for v in parsed if str(v).strip()]
        return names

    def create(self, validated_data):
        photos_before = validated_data.pop('photos_before', [])
        varieties     = validated_data.pop('varieties', [])
        lat = validated_data.pop('latitude',  None)
        lng = validated_data.pop('longitude', None)

        if lat is not None and lng is not None:
            validated_data['location']  = Point(lng, lat)
            validated_data['latitude']  = lat
            validated_data['longitude'] = lng

        # Keep the singular `variety` in sync with the list (backward compat).
        if varieties:
            validated_data['varieties'] = varieties
            validated_data['variety']   = varieties[0]
        elif validated_data.get('variety'):
            validated_data['varieties'] = [validated_data['variety']]

        user = self.context['request'].user
        validated_data['executive']  = user
        validated_data['is_synced']  = True
        validated_data['demo_phase'] = 'before'

        # Atomic: the demo and its before-photos commit together or roll back
        # together. A failed photo upload won't leave a partial demo that a
        # retried sync would short-circuit on via the local_id idempotency guard.
        with transaction.atomic():
            demo = ProductDemo.objects.create(**validated_data)

            for img in photos_before:
                DemoPhoto.objects.create(demo=demo, image=img, photo_type='before')

        for field in ('block_name', 'crop_name', 'product_name'):
            val = validated_data.get(field, '')
            if val:
                logger.info(
                    'custom_value_submitted',
                    extra={'user_id': user.id, 'module': 'product_demo', 'field': field, 'value': val},
                )

        return demo


# ── List ──────────────────────────────────────────────────────────────────────

class ProductDemoListSerializer(serializers.ModelSerializer):
    before_photo_count = serializers.SerializerMethodField()
    after_photo_count  = serializers.SerializerMethodField()

    class Meta:
        model  = ProductDemo
        fields = [
            'id', 'farmer_name', 'village_name', 'product_name',
            'demo_result', 'demo_phase', 'demo_date', 'submitted_at',
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
    is_locked = serializers.SerializerMethodField()

    class Meta:
        model  = ProductDemo
        fields = [
            'id', 'farmer_name', 'mobile_number', 'village_name', 'block_name',
            'district_name', 'total_land_acre',
            'crop_name', 'variety', 'varieties', 'crop_stage', 'crop_stage_days', 'demo_date',
            'product_name', 'dose', 'dose_unit',
            'demo_result', 'demo_phase', 'additional_observations', 'remark',
            'latitude', 'longitude', 'location_display',
            'photos', 'submitted_at', 'updated_at',
            'local_id', 'is_synced', 'approval_status', 'is_locked',
        ]

    def get_location_display(self, obj):
        if obj.latitude is not None and obj.longitude is not None:
            return f"{abs(obj.latitude):.4f}° N, {abs(obj.longitude):.4f}° E"
        return None

    def get_is_locked(self, obj) -> bool:
        return _approval_is_locked(obj)
