# /media/kushagra/crucial/FPS internship/fps/backend/crops/serializers.py

import json
from rest_framework import serializers
from django.contrib.gis.geos import Point
from .models import (
    Village, Farmer, CropEntry, CropPhoto,
    District, Block, CropMaster, CropVariety,
    FarmerVisit, CropRecord, VisitPhoto,
)


# ─────────────────────────────────────────────────────────────────────────────
# EXISTING SERIALIZERS — PRESERVED UNCHANGED
# ─────────────────────────────────────────────────────────────────────────────

class VillageSerializer(serializers.ModelSerializer):
    """
    Minimal serializer for village dropdowns in the mobile app.
    Read-only.
    """

    class Meta:
        model = Village
        fields = ['id', 'name', 'taluka', 'district', 'state']


class CropPhotoSerializer(serializers.ModelSerializer):
    """
    Serializer for photos attached to a (legacy) crop entry.
    """

    class Meta:
        model = CropPhoto
        fields = ['id', 'photo', 'caption', 'taken_at']


class FarmerSerializer(serializers.ModelSerializer):
    """
    Serializer for farmer data, embedding village name for display.
    """
    village_name = serializers.CharField(source='village.name', read_only=True)
    district = serializers.CharField(source='village.district', read_only=True)

    class Meta:
        model = Farmer
        fields = ['id', 'name', 'phone_number', 'village', 'village_name', 'district']


class CropEntrySerializer(serializers.ModelSerializer):
    """
    Full CRUD serializer for (legacy) crop entries.

    Read:  embeds farmer name, village name, district, and nested photos.
    Write: accepts `latitude` + `longitude` float fields; converts to PostGIS Point.
           `submitted_by` is auto-set from the authenticated request user.
    """

    # -- Read-only computed fields --
    photos = CropPhotoSerializer(many=True, read_only=True)
    farmer_name = serializers.CharField(source='farmer.name', read_only=True)
    village_name = serializers.CharField(source='farmer.village.name', read_only=True)
    district = serializers.CharField(source='farmer.village.district', read_only=True)

    # -- Write-only lat/lng (avoids exposing WKT/GeoJSON complexity to mobile) --
    latitude = serializers.FloatField(write_only=True, required=False)
    longitude = serializers.FloatField(write_only=True, required=False)

    class Meta:
        model = CropEntry
        fields = [
            'id', 'farmer', 'farmer_name', 'village_name', 'district',
            'crop_name', 'area_this_year', 'area_last_year', 'sowing_date',
            'crop_stage', 'crop_condition', 'expected_yield', 'buyer_interest',
            'problem_pest', 'problem_disease', 'problem_weather',
            'problem_price_concern', 'problem_other',
            'visit_date', 'created_at', 'local_id',
            'latitude', 'longitude', 'photos'
        ]
        read_only_fields = ['id', 'created_at']

    def create(self, validated_data):
        latitude = validated_data.pop('latitude', None)
        longitude = validated_data.pop('longitude', None)
        if latitude is not None and longitude is not None:
            validated_data['location'] = Point(longitude, latitude)
        # Automatically assign the submitting user
        validated_data['submitted_by'] = self.context['request'].user
        return super().create(validated_data)

    def update(self, instance, validated_data):
        latitude = validated_data.pop('latitude', None)
        longitude = validated_data.pop('longitude', None)
        if latitude is not None and longitude is not None:
            validated_data['location'] = Point(longitude, latitude)
        return super().update(instance, validated_data)


# ─────────────────────────────────────────────────────────────────────────────
# NEW SERIALIZERS — CROP MONITORING MODULE
# ─────────────────────────────────────────────────────────────────────────────

class DistrictSerializer(serializers.ModelSerializer):
    class Meta:
        model = District
        fields = ['id', 'name', 'state']


class BlockSerializer(serializers.ModelSerializer):
    district_name = serializers.CharField(source='district.name', read_only=True)

    class Meta:
        model = Block
        fields = ['id', 'name', 'district', 'district_name']


class CropVarietySerializer(serializers.ModelSerializer):
    class Meta:
        model = CropVariety
        fields = ['id', 'variety_name']


class CropMasterSerializer(serializers.ModelSerializer):
    varieties = CropVarietySerializer(many=True, read_only=True)

    class Meta:
        model = CropMaster
        fields = ['id', 'crop_name', 'varieties']


class VisitPhotoSerializer(serializers.ModelSerializer):
    class Meta:
        model = VisitPhoto
        fields = ['id', 'image', 'uploaded_at']
        read_only_fields = ['id', 'uploaded_at']


class CropRecordSerializer(serializers.ModelSerializer):
    """
    Used both for nested write inside FarmerVisitCreateSerializer
    and for nested read inside FarmerVisitDetailSerializer.
    """
    class Meta:
        model = CropRecord
        fields = [
            'id', 'crop_name', 'variety', 'date_of_sowing',
            'current_area_acre', 'last_year_area_acre', 'this_year_area_acre',
            'crop_stage', 'crop_condition', 'problems',
            'other_problem_detail', 'sort_order',
        ]
        read_only_fields = ['id']


class FarmerVisitListSerializer(serializers.ModelSerializer):
    """
    Lightweight serializer for list views (dashboard Recent Entries).
    """
    crop_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = FarmerVisit
        fields = [
            'id', 'farmer_name', 'village_name', 'block_name',
            'district_name', 'crop_count', 'submitted_at',
        ]


class FarmerVisitDetailSerializer(serializers.ModelSerializer):
    """
    Full detail read serializer — includes all crops and photos.
    """
    crops = CropRecordSerializer(many=True, read_only=True)
    photos = VisitPhotoSerializer(many=True, read_only=True)
    crop_count = serializers.SerializerMethodField()
    location_display = serializers.SerializerMethodField()

    class Meta:
        model = FarmerVisit
        fields = [
            'id', 'farmer_name', 'mobile_number', 'village_name',
            'block_name', 'district_name', 'total_land_acre',
            'latitude', 'longitude', 'location_display',
            'remark', 'submitted_at', 'crop_count', 'crops', 'photos',
            'local_id', 'is_synced',
        ]

    def get_crop_count(self, obj: FarmerVisit) -> int:
        return obj.crops.count()

    def get_location_display(self, obj: FarmerVisit) -> str | None:
        if obj.latitude is not None and obj.longitude is not None:
            return f"{obj.latitude:.4f}° N, {obj.longitude:.4f}° E"
        return None


class FarmerVisitCreateSerializer(serializers.ModelSerializer):
    """
    Write serializer for POST /api/farmer-visits/.

    Accepts multipart/form-data:
    - Standard farmer fields as form fields
    - `crops` as a JSON string (list of crop record dicts)
    - `photos` as uploaded image files (repeatable field)

    Creates FarmerVisit + CropRecord children + VisitPhoto children atomically.
    """
    # `crops` arrives as a JSON string from FormData (standard multipart workaround)
    crops = serializers.CharField(write_only=True, help_text='JSON-encoded list of crop records')
    # `photos` is a list of uploaded files
    photos = serializers.ListField(
        child=serializers.ImageField(),
        write_only=True,
        required=False,
    )

    class Meta:
        model = FarmerVisit
        fields = [
            'farmer_name', 'mobile_number', 'village_name', 'block_name',
            'district_name', 'total_land_acre', 'latitude', 'longitude',
            'remark', 'local_id', 'crops', 'photos',
        ]

    def validate_mobile_number(self, value: str) -> str:
        cleaned = value.strip()
        if not cleaned.isdigit() or len(cleaned) != 10:
            raise serializers.ValidationError("Mobile number must be exactly 10 digits.")
        return cleaned

    def validate_total_land_acre(self, value):
        if value <= 0:
            raise serializers.ValidationError("Total land must be greater than 0.")
        return value

    def validate_crops(self, value: str) -> list:
        """Parse and validate the JSON-encoded crops list."""
        try:
            crops_data = json.loads(value)
        except (json.JSONDecodeError, TypeError):
            raise serializers.ValidationError("crops must be a valid JSON string.")

        if not isinstance(crops_data, list) or len(crops_data) == 0:
            raise serializers.ValidationError("At least one crop record is required.")

        valid_stages = {c[0] for c in CropRecord.CROP_STAGE_CHOICES}
        valid_conditions = {c[0] for c in CropRecord.CONDITION_CHOICES}
        valid_problems = {'pest', 'disease', 'weather', 'price', 'labour', 'other'}

        for i, crop in enumerate(crops_data):
            label = f"crops[{i}]"
            if not crop.get('crop_name', '').strip():
                raise serializers.ValidationError(f"{label}: crop_name is required.")
            if not crop.get('variety', '').strip():
                raise serializers.ValidationError(f"{label}: variety is required.")
            if not crop.get('date_of_sowing', '').strip():
                raise serializers.ValidationError(f"{label}: date_of_sowing is required.")
            if crop.get('crop_stage') not in valid_stages:
                raise serializers.ValidationError(
                    f"{label}: crop_stage must be one of {sorted(valid_stages)}."
                )
            if crop.get('crop_condition') not in valid_conditions:
                raise serializers.ValidationError(
                    f"{label}: crop_condition must be one of {sorted(valid_conditions)}."
                )
            problems = crop.get('problems', [])
            if not isinstance(problems, list) or len(problems) == 0:
                raise serializers.ValidationError(f"{label}: at least one problem must be selected.")
            invalid_problems = set(problems) - valid_problems
            if invalid_problems:
                raise serializers.ValidationError(
                    f"{label}: invalid problem types: {invalid_problems}."
                )
            if 'other' in problems and not crop.get('other_problem_detail', '').strip():
                raise serializers.ValidationError(
                    f"{label}: other_problem_detail is required when 'other' is selected."
                )

        return crops_data

    def create(self, validated_data: dict) -> FarmerVisit:
        crops_data: list = validated_data.pop('crops')
        photos_data: list = validated_data.pop('photos', [])

        # Build PostGIS Point from lat/lng
        latitude = validated_data.get('latitude')
        longitude = validated_data.get('longitude')
        if latitude is not None and longitude is not None:
            validated_data['location'] = Point(longitude, latitude)

        # Assign executive from request context
        validated_data['executive'] = self.context['request'].user

        visit = FarmerVisit.objects.create(**validated_data)

        # Create child crop records
        for i, crop_dict in enumerate(crops_data):
            CropRecord.objects.create(
                visit=visit,
                crop_name=crop_dict['crop_name'],
                variety=crop_dict['variety'],
                date_of_sowing=crop_dict['date_of_sowing'],
                current_area_acre=crop_dict['current_area_acre'],
                last_year_area_acre=crop_dict.get('last_year_area_acre') or None,
                this_year_area_acre=crop_dict['this_year_area_acre'],
                crop_stage=crop_dict['crop_stage'],
                crop_condition=crop_dict['crop_condition'],
                problems=crop_dict.get('problems', []),
                other_problem_detail=crop_dict.get('other_problem_detail', ''),
                sort_order=crop_dict.get('sort_order', i),
            )

        # Create child photos
        for photo_file in photos_data:
            VisitPhoto.objects.create(visit=visit, image=photo_file)

        return visit


class FarmerVisitSummarySerializer(serializers.Serializer):
    """
    Read-only serializer for the dashboard summary endpoint.
    """
    today = serializers.IntegerField()
    this_week = serializers.IntegerField()
    this_month = serializers.IntegerField()
    team_members = serializers.IntegerField()
