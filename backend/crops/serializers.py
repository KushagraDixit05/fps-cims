from rest_framework import serializers
from django.contrib.gis.geos import Point
from .models import Village, Farmer, CropEntry, CropPhoto


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
    Serializer for photos attached to a crop entry.
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
    Full CRUD serializer for crop entries.

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
