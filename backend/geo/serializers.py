from rest_framework import serializers
from crops.models import FarmerVisit, CropRecord, VisitPhoto
from product_demo.models import ProductDemo, DemoPhoto
from mandi.models import MandiArrival


def _person_name(user):
    """Best-effort display name for a User (full name → username → None)."""
    if not user:
        return None
    return user.get_full_name() or user.username


class PersonBriefSerializer(serializers.Serializer):
    """Compact user block reused for executive / submitted_by detail blocks."""
    name        = serializers.SerializerMethodField()
    phone       = serializers.CharField(source='phone_number', default=None)
    email       = serializers.EmailField(default=None)
    employee_id = serializers.CharField(default=None)
    role        = serializers.CharField(default=None)
    region      = serializers.CharField(default=None)
    state       = serializers.CharField(default=None)

    def get_name(self, obj):
        return _person_name(obj)


class CropRecordSerializer(serializers.ModelSerializer):
    class Meta:
        model = CropRecord
        fields = [
            'id', 'crop_name', 'variety', 'crop_stage', 'crop_condition',
            'current_area_acre', 'last_year_area_acre', 'this_year_area_acre',
            'date_of_sowing', 'problems', 'other_problem_detail', 'sort_order',
        ]


class VisitPhotoSerializer(serializers.ModelSerializer):
    url = serializers.SerializerMethodField()

    class Meta:
        model = VisitPhoto
        fields = ['id', 'url', 'uploaded_at']

    def get_url(self, obj):
        request = self.context.get('request')
        if request and obj.image:
            return request.build_absolute_uri(obj.image.url)
        return obj.image.url if obj.image else None


class VisitRecordSerializer(serializers.ModelSerializer):
    crops = CropRecordSerializer(many=True, read_only=True)
    photos = VisitPhotoSerializer(many=True, read_only=True)
    executive_name = serializers.SerializerMethodField()
    executive = serializers.SerializerMethodField()
    photo_count = serializers.SerializerMethodField()

    class Meta:
        model = FarmerVisit
        fields = [
            'id', 'farmer_name', 'mobile_number', 'village_name', 'block_name',
            'district_name', 'total_land_acre', 'latitude', 'longitude',
            'remark', 'submitted_at', 'updated_at', 'approval_status',
            'local_id', 'is_synced',
            'crops', 'photos', 'executive_name', 'executive', 'photo_count',
        ]

    def get_executive_name(self, obj):
        return _person_name(obj.executive)

    def get_executive(self, obj):
        return PersonBriefSerializer(obj.executive).data if obj.executive else None

    def get_photo_count(self, obj):
        return obj.photos.count()


class DemoPhotoSerializer(serializers.ModelSerializer):
    url = serializers.SerializerMethodField()

    class Meta:
        model = DemoPhoto
        fields = ['id', 'url', 'photo_type', 'uploaded_at']

    def get_url(self, obj):
        request = self.context.get('request')
        if request and obj.image:
            return request.build_absolute_uri(obj.image.url)
        return obj.image.url if obj.image else None


class DemoRecordSerializer(serializers.ModelSerializer):
    photos = DemoPhotoSerializer(many=True, read_only=True)
    executive_name = serializers.SerializerMethodField()
    executive = serializers.SerializerMethodField()
    before_photo_count = serializers.IntegerField(read_only=True)
    after_photo_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = ProductDemo
        fields = [
            'id', 'farmer_name', 'mobile_number', 'village_name', 'block_name',
            'district_name', 'total_land_acre',
            'crop_name', 'variety', 'varieties', 'crop_stage', 'crop_stage_days',
            'product_name', 'dose', 'dose_unit',
            'demo_result', 'demo_phase', 'demo_date',
            'additional_observations', 'remark',
            'submitted_at', 'updated_at', 'latitude', 'longitude',
            'approval_status', 'local_id', 'is_synced',
            'executive_name', 'executive',
            'photos', 'before_photo_count', 'after_photo_count',
        ]

    def get_executive_name(self, obj):
        return _person_name(obj.executive)

    def get_executive(self, obj):
        return PersonBriefSerializer(obj.executive).data if obj.executive else None


class MandiRecordSerializer(serializers.ModelSerializer):
    mandi_name = serializers.CharField(source='mandi.name')
    district = serializers.CharField(source='mandi.district')
    state = serializers.CharField(source='mandi.state')
    mandi_active = serializers.BooleanField(source='mandi.is_active')
    submitted_by_name = serializers.SerializerMethodField()
    submitted_by = serializers.SerializerMethodField()

    class Meta:
        model = MandiArrival
        fields = [
            'id', 'mandi_name', 'district', 'state', 'mandi_active',
            'commodity', 'date',
            'arrival_quantity', 'avg_rate', 'min_rate', 'max_rate',
            'source', 'custom_source', 'remark', 'created_at',
            'approval_status', 'local_id',
            'submitted_by_name', 'submitted_by',
        ]

    def get_submitted_by_name(self, obj):
        return _person_name(obj.submitted_by)

    def get_submitted_by(self, obj):
        return PersonBriefSerializer(obj.submitted_by).data if obj.submitted_by else None
