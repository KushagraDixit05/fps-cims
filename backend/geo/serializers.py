from rest_framework import serializers
from crops.models import FarmerVisit, CropRecord
from product_demo.models import ProductDemo
from mandi.models import MandiArrival


class CropRecordSerializer(serializers.ModelSerializer):
    class Meta:
        model = CropRecord
        fields = ['id', 'crop_name', 'variety', 'crop_stage', 'crop_condition', 'current_area_acre', 'problems']


class VisitRecordSerializer(serializers.ModelSerializer):
    crops = CropRecordSerializer(many=True, read_only=True)
    executive_name = serializers.SerializerMethodField()
    photo_count = serializers.SerializerMethodField()

    class Meta:
        model = FarmerVisit
        fields = [
            'id', 'farmer_name', 'mobile_number', 'village_name', 'block_name',
            'district_name', 'total_land_acre', 'latitude', 'longitude',
            'submitted_at', 'approval_status', 'crops', 'executive_name', 'photo_count',
        ]

    def get_executive_name(self, obj):
        if obj.executive:
            return obj.executive.full_name or obj.executive.username
        return None

    def get_photo_count(self, obj):
        return obj.photos.count()


class DemoRecordSerializer(serializers.ModelSerializer):
    executive_name = serializers.SerializerMethodField()

    class Meta:
        model = ProductDemo
        fields = [
            'id', 'farmer_name', 'village_name', 'block_name', 'district_name',
            'crop_name', 'variety', 'product_name', 'dose', 'dose_unit',
            'demo_result', 'demo_phase', 'submitted_at', 'latitude', 'longitude',
            'approval_status', 'executive_name',
        ]

    def get_executive_name(self, obj):
        if obj.executive:
            return obj.executive.full_name or obj.executive.username
        return None


class MandiRecordSerializer(serializers.ModelSerializer):
    mandi_name = serializers.CharField(source='mandi.name')
    district = serializers.CharField(source='mandi.district')

    class Meta:
        model = MandiArrival
        fields = [
            'id', 'mandi_name', 'district', 'commodity', 'date',
            'arrival_quantity', 'avg_rate', 'min_rate', 'max_rate', 'source',
        ]
