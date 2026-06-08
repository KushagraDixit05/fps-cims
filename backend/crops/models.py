# /media/kushagra/crucial/FPS internship/fps/backend/crops/models.py

from django.contrib.gis.db import models  # PostGIS spatial models
from django.conf import settings
import uuid


# ─────────────────────────────────────────────────────────────────────────────
# EXISTING MODELS — PRESERVED UNCHANGED
# ─────────────────────────────────────────────────────────────────────────────

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

    PRESERVED: Do not modify. New visits use FarmerVisit + CropRecord.
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
    Photos attached to a (legacy) crop entry.
    Multiple photos per entry are allowed.
    """
    crop_entry = models.ForeignKey(CropEntry, on_delete=models.CASCADE, related_name='photos')
    photo = models.ImageField(upload_to='crop_photos/%Y/%m/')
    caption = models.CharField(max_length=200, blank=True)
    taken_at = models.DateTimeField(null=True, blank=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Photo for {self.crop_entry}"


# ─────────────────────────────────────────────────────────────────────────────
# NEW MODELS — CROP MONITORING MODULE
# ─────────────────────────────────────────────────────────────────────────────

class District(models.Model):
    """
    District master list. Seeded via seed_crop_master management command.
    """
    name = models.CharField(max_length=100, unique=True)
    state = models.CharField(max_length=100, default='')
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['name']
        verbose_name = 'District'
        verbose_name_plural = 'Districts'

    def __str__(self):
        return f"{self.name}, {self.state}"


class Block(models.Model):
    """
    Block (taluka/tehsil) master list, linked to a district.
    Seeded via seed_crop_master management command.
    """
    name = models.CharField(max_length=100)
    district = models.ForeignKey(District, on_delete=models.CASCADE, related_name='blocks')
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['district__name', 'name']
        unique_together = [['name', 'district']]
        verbose_name = 'Block'
        verbose_name_plural = 'Blocks'

    def __str__(self):
        return f"{self.name} ({self.district.name})"


class VillageMaster(models.Model):
    """
    Master list of villages, linked to a Block (taluka/tehsil).
    This is the NEW village master used by the Crop Monitoring and Product Demo
    modules — distinct from the legacy Village model used by Farmer/CropEntry.
    Seeded via seed_crop_master management command.
    """
    name = models.CharField(max_length=200)
    block = models.ForeignKey(Block, on_delete=models.CASCADE, related_name='villages')
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['block__district__name', 'block__name', 'name']
        unique_together = [['name', 'block']]
        verbose_name = 'Village Master'
        verbose_name_plural = 'Village Masters'

    def __str__(self):
        return f"{self.name} — {self.block.name} ({self.block.district.name})"


class CropMaster(models.Model):
    """
    Master list of crop types (e.g. Chilli, Soybean).
    Seeded via seed_crop_master management command.
    """
    crop_name = models.CharField(max_length=100, unique=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['crop_name']
        verbose_name = 'Crop Master'
        verbose_name_plural = 'Crop Masters'

    def __str__(self):
        return self.crop_name


class CropVariety(models.Model):
    """
    Varieties for each crop in CropMaster (e.g. Teja, LCA 305 under Chilli).
    """
    crop = models.ForeignKey(CropMaster, on_delete=models.CASCADE, related_name='varieties')
    variety_name = models.CharField(max_length=100)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['variety_name']
        unique_together = [['crop', 'variety_name']]
        verbose_name = 'Crop Variety'
        verbose_name_plural = 'Crop Varieties'

    def __str__(self):
        return f"{self.variety_name} ({self.crop.crop_name})"


class FarmerVisit(models.Model):
    """
    A single field executive visit to a farmer.
    Contains one or more CropRecord children (multi-crop support)
    and one or more VisitPhoto children.

    Parallel to the legacy CropEntry — does NOT replace it.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    executive = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='farmer_visits'
    )

    # Farmer details captured free-text at visit time
    farmer_name = models.CharField(max_length=200)
    mobile_number = models.CharField(max_length=10)
    village_name = models.CharField(max_length=200)
    block_name = models.CharField(max_length=200)
    district_name = models.CharField(max_length=200)
    total_land_acre = models.DecimalField(max_digits=8, decimal_places=4)

    # GPS location (PostGIS Point — auto-populated from lat/lng in serializer)
    location = models.PointField(null=True, blank=True)
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)

    remark = models.TextField(blank=True)
    submitted_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # Phase 3 offline sync fields
    local_id = models.CharField(max_length=100, blank=True)
    is_synced = models.BooleanField(default=True)

    class Meta:
        ordering = ['-submitted_at']
        verbose_name = 'Farmer Visit'
        verbose_name_plural = 'Farmer Visits'

    def __str__(self):
        return f"{self.farmer_name} — {self.block_name} — {self.submitted_at:%Y-%m-%d}"

    @property
    def crop_count(self):
        return self.crops.count()


class CropRecord(models.Model):
    """
    One crop entry within a FarmerVisit.
    A single visit can have multiple crop records.
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
        ('good', 'Good'),
        ('average', 'Average'),
        ('poor', 'Poor'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    visit = models.ForeignKey(FarmerVisit, on_delete=models.CASCADE, related_name='crops')

    crop_name = models.CharField(max_length=100)
    variety = models.CharField(max_length=100)
    date_of_sowing = models.DateField()
    current_area_acre = models.DecimalField(max_digits=8, decimal_places=4)
    last_year_area_acre = models.DecimalField(max_digits=8, decimal_places=4, null=True, blank=True)
    this_year_area_acre = models.DecimalField(max_digits=8, decimal_places=4)
    crop_stage = models.CharField(max_length=20, choices=CROP_STAGE_CHOICES)
    crop_condition = models.CharField(max_length=10, choices=CONDITION_CHOICES)

    # Stored as JSON list of strings: ["pest", "disease", "weather", "price", "labour", "other"]
    problems = models.JSONField(default=list)
    other_problem_detail = models.CharField(max_length=500, blank=True)

    # Preserves the UI display order from the mobile form
    sort_order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ['sort_order']
        verbose_name = 'Crop Record'
        verbose_name_plural = 'Crop Records'

    def __str__(self):
        return f"{self.crop_name} ({self.variety}) — {self.visit}"


class VisitPhoto(models.Model):
    """
    Photos attached to a FarmerVisit.
    Minimum 2 photos enforced client-side; server accepts any number >= 1.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    visit = models.ForeignKey(FarmerVisit, on_delete=models.CASCADE, related_name='photos')
    image = models.ImageField(upload_to='visit_photos/%Y/%m/')
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['uploaded_at']
        verbose_name = 'Visit Photo'
        verbose_name_plural = 'Visit Photos'

    def __str__(self):
        return f"Photo for visit {self.visit_id}"
