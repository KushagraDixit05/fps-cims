from django.contrib.gis.db import models  # PostGIS spatial models
from django.conf import settings
import uuid


class Village(models.Model):
    """
    Master list of villages. Pre-loaded reference data.
    Used to link farmers and crop entries to a geographical location.
    """
    name = models.CharField(max_length=100)
    taluka = models.CharField(max_length=100)
    district = models.CharField(max_length=100)
    state = models.CharField(max_length=100)
    location = models.PointField(null=True, blank=True)  # GPS center point (PostGIS)

    class Meta:
        ordering = ['district', 'name']
        verbose_name = 'Village'
        verbose_name_plural = 'Villages'

    def __str__(self):
        return f"{self.name}, {self.district}"


class Farmer(models.Model):
    """
    Farmer registered in the system.
    Linked to a village; can have many crop entries.
    """
    name = models.CharField(max_length=200)
    phone_number = models.CharField(max_length=15, blank=True)
    village = models.ForeignKey(Village, on_delete=models.PROTECT, related_name='farmers')
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='registered_farmers'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return f"{self.name} — {self.village}"


class CropEntry(models.Model):
    """
    Core model — one entry per field visit per farmer.
    Field executives fill this during their mobile app visit.
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

    # -- Identification --
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    farmer = models.ForeignKey(Farmer, on_delete=models.CASCADE, related_name='crop_entries')
    submitted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='crop_submissions'
    )

    # -- Acreage --
    crop_name = models.CharField(max_length=50, default='Chili')
    area_this_year = models.DecimalField(max_digits=8, decimal_places=2)
    area_last_year = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    sowing_date = models.DateField(null=True, blank=True)

    # -- Crop status --
    crop_stage = models.CharField(max_length=20, choices=CROP_STAGE_CHOICES)
    crop_condition = models.CharField(max_length=10, choices=CONDITION_CHOICES)
    expected_yield = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Quintal per Acre"
    )
    buyer_interest = models.BooleanField(null=True)

    # -- Field issues --
    problem_pest = models.BooleanField(default=False)
    problem_disease = models.BooleanField(default=False)
    problem_weather = models.BooleanField(default=False)
    problem_price_concern = models.BooleanField(default=False)
    problem_other = models.CharField(max_length=500, blank=True)

    # -- Location (PostGIS) --
    location = models.PointField(null=True, blank=True)

    # -- Timestamps & sync --
    visit_date = models.DateField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # For offline sync: WatermelonDB local ID
    local_id = models.CharField(max_length=100, blank=True)

    class Meta:
        ordering = ['-visit_date']
        verbose_name = 'Crop Entry'
        verbose_name_plural = 'Crop Entries'

    def __str__(self):
        return f"{self.farmer.name} · {self.visit_date} · {self.crop_condition}"


class CropPhoto(models.Model):
    """
    Photos attached to a crop entry.
    Multiple photos per entry are allowed.
    """
    crop_entry = models.ForeignKey(CropEntry, on_delete=models.CASCADE, related_name='photos')
    photo = models.ImageField(upload_to='crop_photos/%Y/%m/')
    caption = models.CharField(max_length=200, blank=True)
    taken_at = models.DateTimeField(null=True, blank=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Photo for {self.crop_entry}"
