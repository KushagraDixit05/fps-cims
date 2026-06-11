from django.contrib.gis.db import models
from django.conf import settings
import uuid


class ProductMaster(models.Model):
    """Reference catalogue of agrochemical products shown in the demo wizard dropdown."""
    name     = models.CharField(max_length=200, unique=True)
    category = models.CharField(max_length=100, blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['name']
        verbose_name = 'Product'
        verbose_name_plural = 'Products'

    def __str__(self):
        return self.name


class ProductDemo(models.Model):
    """One product demonstration visit record captured by a field executive."""

    CROP_STAGE_CHOICES = [
        ('seedling',    'Seedling'),
        ('vegetative',  'Vegetative'),
        ('flowering',   'Flowering'),
        ('fruiting',    'Fruiting'),
        ('harvesting',  'Harvesting'),
        ('post_harvest', 'Post Harvest'),
    ]

    DOSE_UNIT_CHOICES = [
        ('ml/acre', 'ml/acre'),
        ('gm/acre', 'gm/acre'),
        ('kg/acre', 'kg/acre'),
        ('lt/acre', 'lt/acre'),
        ('kg/ha',   'kg/ha'),
    ]

    DEMO_RESULT_CHOICES = [
        ('excellent', 'Excellent'),
        ('good',      'Good'),
        ('average',   'Average'),
        ('poor',      'Poor'),
        ('no_effect', 'No Effect'),
    ]

    id           = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    executive    = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='product_demos',
    )

    # Step 1 — Farmer details (free-text, matches CMM pattern)
    farmer_name   = models.CharField(max_length=200)
    mobile_number = models.CharField(max_length=15, blank=True)
    village_name  = models.CharField(max_length=200)
    block_name    = models.CharField(max_length=200)
    district_name = models.CharField(max_length=200)
    total_land_acre = models.DecimalField(max_digits=8, decimal_places=4, null=True, blank=True)

    # Step 2 — Crop & stage
    crop_name      = models.CharField(max_length=200)
    variety        = models.CharField(max_length=200)
    crop_stage     = models.CharField(max_length=20, choices=CROP_STAGE_CHOICES)
    crop_stage_days = models.PositiveSmallIntegerField()
    demo_date      = models.DateField()

    # Step 3 — Product & dose
    product_name = models.CharField(max_length=200)
    dose         = models.DecimalField(max_digits=10, decimal_places=4)
    dose_unit    = models.CharField(max_length=20, choices=DOSE_UNIT_CHOICES)

    # Step 4 — Result
    demo_result              = models.CharField(max_length=20, choices=DEMO_RESULT_CHOICES)
    additional_observations  = models.TextField(blank=True)
    remark                   = models.TextField(blank=True)

    # GPS
    location  = models.PointField(null=True, blank=True)
    latitude  = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)

    # Sync / audit
    local_id     = models.CharField(max_length=100, blank=True)
    is_synced    = models.BooleanField(default=True)
    submitted_at = models.DateTimeField(auto_now_add=True)
    updated_at   = models.DateTimeField(auto_now=True)

    # RBAC Phase 3 — approval workflow
    APPROVAL_STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('submitted', 'Submitted'),
        ('under_review', 'Under Review'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
        ('revision_requested', 'Revision Requested'),
        ('resubmitted', 'Resubmitted'),
    ]
    approval_status = models.CharField(
        max_length=30, choices=APPROVAL_STATUS_CHOICES, default='draft', db_index=True
    )

    class Meta:
        ordering = ['-submitted_at']
        verbose_name = 'Product Demo'
        verbose_name_plural = 'Product Demos'

    def __str__(self):
        return f"{self.farmer_name} — {self.product_name} ({self.demo_date})"

    @property
    def before_photo_count(self):
        return self.photos.filter(photo_type='before').count()

    @property
    def after_photo_count(self):
        return self.photos.filter(photo_type='after').count()


class DemoPhoto(models.Model):
    """Before/after photos attached to a product demo entry."""

    PHOTO_TYPE_CHOICES = [
        ('before', 'Before Demo'),
        ('after',  'After Demo'),
    ]

    id          = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    demo        = models.ForeignKey(ProductDemo, on_delete=models.CASCADE, related_name='photos')
    image       = models.ImageField(upload_to='demo_photos/%Y/%m/')
    photo_type  = models.CharField(max_length=10, choices=PHOTO_TYPE_CHOICES)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['photo_type', 'uploaded_at']

    def __str__(self):
        return f"{self.demo} — {self.photo_type}"
