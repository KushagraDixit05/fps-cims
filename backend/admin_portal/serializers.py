from django.contrib.auth import get_user_model
from rest_framework import serializers
from crops.models import FarmerVisit, CropRecord
from mandi.models import MandiArrival
from product_demo.models import ProductDemo


# ── User Management ───────────────────────────────────────────────────────────

class AdminUserSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()
    reporting_to_name = serializers.SerializerMethodField()
    primary_role = serializers.SerializerMethodField()
    primary_role_id = serializers.SerializerMethodField()

    class Meta:
        model = get_user_model()
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name', 'full_name',
            'phone_number', 'employee_id', 'role',
            'primary_role', 'primary_role_id',
            'state', 'districts',
            'is_active', 'date_joined', 'last_login',
            'deactivated_at', 'deactivation_reason',
            'reporting_to', 'reporting_to_name',
        ]
        read_only_fields = ['id', 'date_joined', 'last_login', 'deactivated_at']

    def get_full_name(self, obj):
        return obj.get_full_name() or obj.username

    def get_reporting_to_name(self, obj):
        if obj.reporting_to:
            return obj.reporting_to.get_full_name() or obj.reporting_to.username
        return None

    def get_primary_role(self, obj):
        return None

    def get_primary_role_id(self, obj):
        return None


class AdminUserCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = get_user_model()
        fields = [
            'username', 'password', 'first_name', 'last_name',
            'email', 'phone_number', 'employee_id', 'role', 'state', 'districts',
        ]

    def create(self, validated_data):
        password = validated_data.pop('password')
        User = get_user_model()
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user


class CropRecordInlineSerializer(serializers.ModelSerializer):
    class Meta:
        model = CropRecord
        fields = [
            'crop_name', 'variety', 'crop_stage', 'crop_condition',
            'this_year_area_acre', 'last_year_area_acre', 'date_of_sowing',
            'problems',
        ]


class FarmerVisitAdminSerializer(serializers.ModelSerializer):
    executive_name = serializers.SerializerMethodField()
    crops = CropRecordInlineSerializer(many=True, read_only=True)
    crop_count = serializers.IntegerField(read_only=True)
    photo_count = serializers.SerializerMethodField()
    dominant_condition = serializers.SerializerMethodField()

    class Meta:
        model = FarmerVisit
        fields = [
            'id', 'submitted_at',
            'executive_name',
            'farmer_name', 'mobile_number',
            'village_name', 'block_name', 'district_name',
            'total_land_acre',
            'crop_count', 'dominant_condition',
            'latitude', 'longitude',
            'remark', 'photo_count',
            'crops',
        ]

    def get_executive_name(self, obj):
        if obj.executive:
            return obj.executive.get_full_name() or obj.executive.username
        return ''

    def get_photo_count(self, obj):
        return obj.photos.count()

    def get_dominant_condition(self, obj):
        conditions = list(obj.crops.values_list('crop_condition', flat=True))
        if not conditions:
            return ''
        for c in ('poor', 'average', 'good'):
            if c in conditions:
                return c
        return conditions[0]


class MandiArrivalAdminSerializer(serializers.ModelSerializer):
    executive_name = serializers.SerializerMethodField()
    mandi_name = serializers.CharField(source='mandi.name', read_only=True)
    mandi_district = serializers.CharField(source='mandi.district', read_only=True)
    mandi_state = serializers.CharField(source='mandi.state', read_only=True)

    class Meta:
        model = MandiArrival
        fields = [
            'id', 'date', 'created_at',
            'executive_name',
            'mandi_name', 'mandi_district', 'mandi_state',
            'commodity', 'arrival_quantity',
            'avg_rate', 'min_rate', 'max_rate',
            'source', 'remark',
        ]

    def get_executive_name(self, obj):
        if obj.submitted_by:
            return obj.submitted_by.get_full_name() or obj.submitted_by.username
        return ''


class ProductDemoAdminSerializer(serializers.ModelSerializer):
    executive_name = serializers.SerializerMethodField()
    before_photos = serializers.IntegerField(source='before_photo_count', read_only=True)
    after_photos = serializers.IntegerField(source='after_photo_count', read_only=True)

    class Meta:
        model = ProductDemo
        fields = [
            'id', 'demo_date', 'submitted_at',
            'executive_name',
            'farmer_name', 'mobile_number',
            'village_name', 'block_name', 'district_name', 'total_land_acre',
            'crop_name', 'variety', 'crop_stage', 'crop_stage_days',
            'product_name', 'dose', 'dose_unit',
            'demo_result', 'additional_observations', 'remark',
            'latitude', 'longitude',
            'before_photos', 'after_photos',
        ]

    def get_executive_name(self, obj):
        if obj.executive:
            return obj.executive.get_full_name() or obj.executive.username
        return ''
