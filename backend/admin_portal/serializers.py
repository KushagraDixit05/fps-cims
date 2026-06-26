from django.contrib.auth import get_user_model
from rest_framework import serializers
from crops.models import FarmerVisit, CropRecord
from mandi.models import MandiArrival
from product_demo.models import ProductDemo
from accounts.models.region import Region, UserRegion
from accounts.models.device import DeviceRegistration, DeviceSyncLog


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
        # Resolves from the real Role FK (Phase 1). Falls back to the legacy
        # `role` CharField while code migrates off it.
        if obj.primary_role_id:
            return obj.primary_role.code
        return obj.role or None

    def get_primary_role_id(self, obj):
        return str(obj.primary_role_id) if obj.primary_role_id else None


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
        if user.role == 'admin':
            user.is_staff = True
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


# ── Phase 5: Region Management ────────────────────────────────────────────────

class RegionUserSerializer(serializers.ModelSerializer):
    """Compact user row for the region → users sub-list."""
    username = serializers.CharField(source='user.username', read_only=True)
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = UserRegion
        fields = ['user_id', 'username', 'full_name', 'role']

    def get_full_name(self, obj):
        return obj.user.get_full_name() or obj.user.username


class RegionSerializer(serializers.ModelSerializer):
    parent_name = serializers.SerializerMethodField()
    user_count = serializers.SerializerMethodField()
    children_count = serializers.SerializerMethodField()

    class Meta:
        model = Region
        fields = [
            'id', 'name', 'code', 'state', 'district', 'taluka',
            'parent', 'parent_name', 'is_active', 'created_at',
            'user_count', 'children_count',
        ]
        read_only_fields = ['id', 'created_at']

    def get_parent_name(self, obj):
        return obj.parent.name if obj.parent_id else None

    def get_user_count(self, obj):
        # Use prefetched cache when available to avoid N+1.
        if hasattr(obj, '_prefetched_objects_cache') and 'region_users' in obj._prefetched_objects_cache:
            return len(obj._prefetched_objects_cache['region_users'])
        return obj.region_users.count()

    def get_children_count(self, obj):
        if hasattr(obj, '_prefetched_objects_cache') and 'children' in obj._prefetched_objects_cache:
            return len(obj._prefetched_objects_cache['children'])
        return obj.children.count()


class RegionDetailSerializer(RegionSerializer):
    users = RegionUserSerializer(source='region_users', many=True, read_only=True)
    children = RegionSerializer(many=True, read_only=True)

    class Meta(RegionSerializer.Meta):
        fields = RegionSerializer.Meta.fields + ['users', 'children']


class RegionWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Region
        fields = ['name', 'code', 'state', 'district', 'taluka', 'parent', 'is_active']

    def validate(self, data):
        parent = data.get('parent')
        instance = self.instance  # None on create
        if parent is None:
            return data
        if instance and parent.pk == instance.pk:
            raise serializers.ValidationError({'parent': 'A region cannot be its own parent.'})
        # Cycle guard: walk up at most 8 hops.
        node = parent
        for _ in range(8):
            if node.parent_id is None:
                break
            if instance and node.parent_id == instance.pk:
                raise serializers.ValidationError({'parent': 'Circular region hierarchy detected.'})
            node = node.parent
        return data


# ── Phase 5: Sync Monitor ─────────────────────────────────────────────────────

class DeviceSyncLogSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    device_identifier = serializers.CharField(source='device.device_id', read_only=True)
    device_name = serializers.CharField(source='device.device_name', read_only=True)
    platform = serializers.CharField(source='device.platform', read_only=True)

    class Meta:
        model = DeviceSyncLog
        fields = [
            'id', 'synced_at', 'username', 'device_identifier', 'device_name',
            'platform', 'sync_type', 'status',
            'records_pushed', 'records_pulled', 'error_detail', 'sync_batch_id',
        ]


class DeviceSummarySerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    last_sync_at = serializers.SerializerMethodField()
    last_sync_status = serializers.SerializerMethodField()

    class Meta:
        model = DeviceRegistration
        fields = [
            'id', 'device_id', 'device_name', 'platform', 'app_version',
            'username', 'last_active_at', 'is_trusted', 'registered_at',
            'last_sync_at', 'last_sync_status',
        ]

    def get_last_sync_at(self, obj):
        last = obj.sync_logs.order_by('-synced_at').first()
        return last.synced_at.isoformat() if last else None

    def get_last_sync_status(self, obj):
        last = obj.sync_logs.order_by('-synced_at').first()
        return last.status if last else None
