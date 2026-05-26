# Phase 1 — Backend: Models, API & Django Admin
**Farm Prosperity Solution · Django + PostgreSQL**
**Duration: Week 3–5**

---

## Goal
Build the entire backend: database models, REST API endpoints, and a working Django admin panel. By the end of this phase, your team can log into the admin and see all crop and mandi data — even before the mobile app is built.

---

## 1.1 — Create Django Apps

Django organizes code into "apps" — each app handles one domain. Create two:

```bash
cd backend
python manage.py startapp crops      # crop monitoring
python manage.py startapp mandi      # mandi arrivals
python manage.py startapp accounts   # users / field executives
```

Add them to `INSTALLED_APPS` in `settings.py`:
```python
INSTALLED_APPS = [
    # ... existing apps ...
    'crops',
    'mandi',
    'accounts',
]
```

Your backend folder now:
```
backend/
├── crops/
│   ├── models.py      ← database tables
│   ├── serializers.py ← JSON conversion
│   ├── views.py       ← API logic
│   ├── urls.py        ← routes
│   └── admin.py       ← admin panel config
├── mandi/
│   ├── models.py
│   ├── serializers.py
│   ├── views.py
│   ├── urls.py
│   └── admin.py
└── accounts/
    ├── models.py
    └── ...
```

---

## 1.2 — Accounts App: Custom User Model

Do this FIRST, before any other models. Django needs the user model before everything else.

### accounts/models.py
```python
from django.contrib.auth.models import AbstractUser
from django.db import models

class User(AbstractUser):
    """
    Custom user — field executives and admins.
    """
    ROLE_CHOICES = [
        ('field_executive', 'Field Executive'),
        ('admin', 'Admin'),
        ('viewer', 'Viewer'),  # for institutional buyers later
    ]

    phone_number = models.CharField(max_length=15, unique=True, null=True, blank=True)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='field_executive')
    region = models.CharField(max_length=100, blank=True)  # e.g. "Nanded", "Guntur"
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.get_full_name()} ({self.role})"
```

### Tell Django to use your custom user model
In `settings.py`:
```python
AUTH_USER_MODEL = 'accounts.User'
```

---

## 1.3 — Crops App: Database Models

### crops/models.py
```python
from django.contrib.gis.db import models  # note: gis models, not regular
from django.conf import settings
import uuid


class Village(models.Model):
    """
    Master list of villages. Pre-loaded data.
    """
    name = models.CharField(max_length=100)
    taluka = models.CharField(max_length=100)
    district = models.CharField(max_length=100)
    state = models.CharField(max_length=100)
    location = models.PointField(null=True, blank=True)  # GPS center point

    def __str__(self):
        return f"{self.name}, {self.district}"

    class Meta:
        ordering = ['district', 'name']


class Farmer(models.Model):
    """
    Farmer registered in the system.
    """
    name = models.CharField(max_length=200)
    phone_number = models.CharField(max_length=15, blank=True)
    village = models.ForeignKey(Village, on_delete=models.PROTECT, related_name='farmers')
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL, null=True,
        related_name='registered_farmers'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} — {self.village}"


class CropEntry(models.Model):
    """
    Core model — one entry per field visit per farmer.
    Field executive fills this on the mobile app.
    """
    CROP_STAGE_CHOICES = [
        ('seedling', 'Seedling'),
        ('vegetative', 'Vegetative'),
        ('flowering', 'Flowering'),
        ('fruiting', 'Fruiting'),
        ('harvesting', 'Harvesting'),
        ('post_harvest', 'Post Harvest'),
    ]

    CONDITION_CHOICES = [
        ('good', 'Good (70–100%)'),
        ('average', 'Average (40–69%)'),
        ('poor', 'Poor (0–39%)'),
    ]

    # Identification
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    farmer = models.ForeignKey(Farmer, on_delete=models.CASCADE, related_name='crop_entries')
    submitted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL, null=True,
        related_name='crop_submissions'
    )

    # Acreage
    crop_name = models.CharField(max_length=50, default='Chili')
    area_this_year = models.DecimalField(max_digits=8, decimal_places=2)
    area_last_year = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    sowing_date = models.DateField(null=True, blank=True)

    # Crop status
    crop_stage = models.CharField(max_length=20, choices=CROP_STAGE_CHOICES)
    crop_condition = models.CharField(max_length=10, choices=CONDITION_CHOICES)
    expected_yield = models.DecimalField(
        max_digits=8, decimal_places=2,
        null=True, blank=True,
        help_text="Quintal per Acre"
    )
    buyer_interest = models.BooleanField(null=True)

    # Issues
    problem_pest = models.BooleanField(default=False)
    problem_disease = models.BooleanField(default=False)
    problem_weather = models.BooleanField(default=False)
    problem_price_concern = models.BooleanField(default=False)
    problem_other = models.CharField(max_length=500, blank=True)

    # Location (PostGIS)
    location = models.PointField(null=True, blank=True)

    # Timestamps & sync
    visit_date = models.DateField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # For offline sync: track if this was created offline
    local_id = models.CharField(max_length=100, blank=True)  # WatermelonDB local ID

    def __str__(self):
        return f"{self.farmer.name} · {self.visit_date} · {self.crop_condition}"

    class Meta:
        ordering = ['-visit_date']
        verbose_name = 'Crop Entry'
        verbose_name_plural = 'Crop Entries'


class CropPhoto(models.Model):
    """
    Photos attached to a crop entry. Multiple photos per entry.
    """
    crop_entry = models.ForeignKey(CropEntry, on_delete=models.CASCADE, related_name='photos')
    photo = models.ImageField(upload_to='crop_photos/%Y/%m/')
    caption = models.CharField(max_length=200, blank=True)
    taken_at = models.DateTimeField(null=True, blank=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Photo for {self.crop_entry}"
```

---

## 1.4 — Mandi App: Database Models

### mandi/models.py
```python
from django.db import models
from django.conf import settings
import uuid


class Mandi(models.Model):
    """
    Master list of mandis (markets).
    """
    name = models.CharField(max_length=200)
    district = models.CharField(max_length=100)
    state = models.CharField(max_length=100)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.name}, {self.state}"

    class Meta:
        verbose_name_plural = 'Mandis'
        ordering = ['state', 'name']


class MandiArrival(models.Model):
    """
    Daily arrival data for a mandi.
    One row = one mandi, one date, one entry.
    """
    SOURCE_CHOICES = [
        ('trader', 'Trader'),
        ('farmer', 'Farmer'),
        ('official', 'Mandi Official'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    mandi = models.ForeignKey(Mandi, on_delete=models.CASCADE, related_name='arrivals')
    submitted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL, null=True,
        related_name='mandi_submissions'
    )

    commodity = models.CharField(max_length=50, default='Chili')
    date = models.DateField()
    arrival_quantity = models.DecimalField(
        max_digits=10, decimal_places=2,
        help_text="Quantity in Quintal"
    )
    avg_rate = models.DecimalField(
        max_digits=10, decimal_places=2,
        null=True, blank=True,
        help_text="Average rate in ₹ per Quintal"
    )
    min_rate = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    max_rate = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)

    source = models.CharField(max_length=20, choices=SOURCE_CHOICES, default='trader')
    remark = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    local_id = models.CharField(max_length=100, blank=True)

    def __str__(self):
        return f"{self.mandi.name} · {self.date} · {self.arrival_quantity} Qt"

    class Meta:
        ordering = ['-date']
        unique_together = ['mandi', 'date', 'commodity']  # one entry per mandi per day
```

---

## 1.5 — Run Migrations

```bash
python manage.py makemigrations accounts
python manage.py makemigrations crops
python manage.py makemigrations mandi
python manage.py migrate

# Create your first admin user:
python manage.py createsuperuser
# Enter username, email, password when prompted
```

---

## 1.6 — Django Admin Panel

This is your free internal tool. Configure it to look useful.

### crops/admin.py
```python
from django.contrib import admin
from django.contrib.gis.admin import GISModelAdmin
from .models import Village, Farmer, CropEntry, CropPhoto


@admin.register(Village)
class VillageAdmin(admin.ModelAdmin):
    list_display = ['name', 'taluka', 'district', 'state']
    search_fields = ['name', 'district']
    list_filter = ['state', 'district']


class CropPhotoInline(admin.TabularInline):
    model = CropPhoto
    extra = 0
    readonly_fields = ['uploaded_at']


@admin.register(CropEntry)
class CropEntryAdmin(GISModelAdmin):  # GISModelAdmin gives you a map widget!
    list_display = [
        'farmer', 'visit_date', 'crop_stage',
        'crop_condition', 'area_this_year',
        'expected_yield', 'submitted_by'
    ]
    list_filter = [
        'crop_condition', 'crop_stage',
        'visit_date', 'farmer__village__district'
    ]
    search_fields = ['farmer__name', 'farmer__village__name']
    date_hierarchy = 'visit_date'
    readonly_fields = ['created_at', 'updated_at']
    inlines = [CropPhotoInline]

    # Summary stats at the top of the list
    def changelist_view(self, request, extra_context=None):
        extra_context = extra_context or {}
        from django.db.models import Sum, Avg
        qs = self.get_queryset(request)
        extra_context['total_acreage'] = qs.aggregate(Sum('area_this_year'))
        extra_context['avg_condition'] = qs.values('crop_condition').count()
        return super().changelist_view(request, extra_context)


@admin.register(Farmer)
class FarmerAdmin(admin.ModelAdmin):
    list_display = ['name', 'phone_number', 'village', 'created_by', 'created_at']
    search_fields = ['name', 'phone_number', 'village__name']
    list_filter = ['village__district']
```

### mandi/admin.py
```python
from django.contrib import admin
from .models import Mandi, MandiArrival


@admin.register(Mandi)
class MandiAdmin(admin.ModelAdmin):
    list_display = ['name', 'district', 'state', 'is_active']
    list_filter = ['state', 'is_active']
    search_fields = ['name', 'district']


@admin.register(MandiArrival)
class MandiArrivalAdmin(admin.ModelAdmin):
    list_display = [
        'mandi', 'date', 'arrival_quantity',
        'avg_rate', 'source', 'submitted_by'
    ]
    list_filter = ['mandi', 'source', 'date']
    search_fields = ['mandi__name']
    date_hierarchy = 'date'
```

Start the server and open http://localhost:8000/admin — you'll see all your models.

---

## 1.7 — REST API: Serializers

Serializers convert your database objects to/from JSON for the mobile app.

### crops/serializers.py
```python
from rest_framework import serializers
from .models import Village, Farmer, CropEntry, CropPhoto


class VillageSerializer(serializers.ModelSerializer):
    class Meta:
        model = Village
        fields = ['id', 'name', 'taluka', 'district', 'state']


class CropPhotoSerializer(serializers.ModelSerializer):
    class Meta:
        model = CropPhoto
        fields = ['id', 'photo', 'caption', 'taken_at']


class CropEntrySerializer(serializers.ModelSerializer):
    photos = CropPhotoSerializer(many=True, read_only=True)
    farmer_name = serializers.CharField(source='farmer.name', read_only=True)
    village_name = serializers.CharField(source='farmer.village.name', read_only=True)
    district = serializers.CharField(source='farmer.village.district', read_only=True)

    # Accept latitude/longitude from mobile app
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
        if latitude and longitude:
            from django.contrib.gis.geos import Point
            validated_data['location'] = Point(longitude, latitude)
        validated_data['submitted_by'] = self.context['request'].user
        return super().create(validated_data)


class MandiArrivalSerializer(serializers.ModelSerializer):
    mandi_name = serializers.CharField(source='mandi.name', read_only=True)
    mandi_state = serializers.CharField(source='mandi.state', read_only=True)

    class Meta:
        from mandi.models import MandiArrival
        model = MandiArrival
        fields = [
            'id', 'mandi', 'mandi_name', 'mandi_state',
            'commodity', 'date', 'arrival_quantity',
            'avg_rate', 'min_rate', 'max_rate',
            'source', 'remark', 'created_at', 'local_id'
        ]
        read_only_fields = ['id', 'created_at']
```

---

## 1.8 — REST API: Views & URLs

### crops/views.py
```python
from rest_framework import viewsets, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from .models import Village, CropEntry, Farmer
from .serializers import VillageSerializer, CropEntrySerializer


class VillageViewSet(viewsets.ReadOnlyModelViewSet):
    """
    List of villages — read only, used to populate dropdowns in the app.
    """
    queryset = Village.objects.all()
    serializer_class = VillageSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['name', 'district']


class CropEntryViewSet(viewsets.ModelViewSet):
    """
    CRUD for crop entries.
    Field executives can only see their own entries.
    Admins can see all.
    """
    serializer_class = CropEntrySerializer
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['crop_condition', 'crop_stage', 'farmer__village__district']
    ordering_fields = ['visit_date', 'created_at']

    def get_queryset(self):
        user = self.request.user
        if user.role == 'admin':
            return CropEntry.objects.select_related(
                'farmer', 'farmer__village'
            ).prefetch_related('photos').all()
        # Field executives see only their submissions
        return CropEntry.objects.filter(submitted_by=user).select_related(
            'farmer', 'farmer__village'
        ).prefetch_related('photos')

    @action(detail=False, methods=['get'])
    def summary(self, request):
        """
        Returns aggregate data for the dashboard.
        GET /api/crops/summary/
        """
        from django.db.models import Sum, Count
        qs = self.get_queryset()
        return Response({
            'total_entries': qs.count(),
            'total_acreage': qs.aggregate(Sum('area_this_year'))['area_this_year__sum'],
            'by_condition': {
                'good': qs.filter(crop_condition='good').count(),
                'average': qs.filter(crop_condition='average').count(),
                'poor': qs.filter(crop_condition='poor').count(),
            },
            'by_stage': {
                stage: qs.filter(crop_stage=stage).count()
                for stage, _ in CropEntry.CROP_STAGE_CHOICES
            }
        })


class MandiArrivalViewSet(viewsets.ModelViewSet):
    from mandi.models import MandiArrival
    from .serializers import MandiArrivalSerializer
    queryset = MandiArrival.objects.select_related('mandi').all()
    serializer_class = MandiArrivalSerializer
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['mandi', 'date', 'commodity']
    ordering_fields = ['date']

    def perform_create(self, serializer):
        serializer.save(submitted_by=self.request.user)

    @action(detail=False, methods=['get'])
    def yoy_comparison(self, request):
        """
        Year-on-year comparison for a specific mandi.
        GET /api/mandi/yoy_comparison/?mandi_id=1
        """
        from mandi.models import MandiArrival
        from django.db.models import Sum
        from datetime import date
        mandi_id = request.query_params.get('mandi_id')
        this_year = date.today().year
        this = MandiArrival.objects.filter(mandi_id=mandi_id, date__year=this_year)
        last = MandiArrival.objects.filter(mandi_id=mandi_id, date__year=this_year - 1)
        return Response({
            'this_year': this.aggregate(total=Sum('arrival_quantity')),
            'last_year': last.aggregate(total=Sum('arrival_quantity')),
        })
```

### fps_backend/urls.py
```python
from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from crops.views import VillageViewSet, CropEntryViewSet
from mandi.views import MandiViewSet, MandiArrivalViewSet

router = DefaultRouter()
router.register(r'villages', VillageViewSet)
router.register(r'crops', CropEntryViewSet, basename='crop')
router.register(r'mandis', MandiViewSet)
router.register(r'mandi-arrivals', MandiArrivalViewSet)

urlpatterns = [
    path('admin/', admin.site.urls),

    # JWT Authentication
    path('api/auth/login/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),

    # All API routes
    path('api/', include(router.urls)),
]
```

---

## 1.9 — Test Your API with Postman

Start the server:
```bash
python manage.py runserver
```

Test these endpoints in Postman:

| Method | URL | What it does |
|--------|-----|-------------|
| `POST` | `/api/auth/login/` | Get JWT token (username + password) |
| `GET` | `/api/crops/` | List all crop entries |
| `POST` | `/api/crops/` | Create a crop entry |
| `GET` | `/api/crops/summary/` | Dashboard stats |
| `GET` | `/api/villages/?search=devgaon` | Search villages |
| `GET` | `/api/mandi-arrivals/` | List mandi arrivals |
| `POST` | `/api/mandi-arrivals/` | Add mandi arrival |
| `GET` | `/api/mandi-arrivals/yoy_comparison/?mandi_id=1` | YoY comparison |

For all requests except login, add header:
```
Authorization: Bearer <token_from_login>
```

---

## 1.10 — Phase 1 Checklist

- [ ] All three apps created (accounts, crops, mandi)
- [ ] Custom User model working
- [ ] All migrations run without errors
- [ ] Django admin shows Crop Entries, Farmers, Mandis
- [ ] Superuser created, admin login works
- [ ] API login returns JWT token
- [ ] POST `/api/crops/` creates a new crop entry
- [ ] GET `/api/crops/summary/` returns stats
- [ ] All endpoints tested in Postman

---

## What's Next
**Phase 2** — Build the React Native mobile app: login screen, home dashboard, crop entry form, and mandi entry form, all connected to this backend API.
