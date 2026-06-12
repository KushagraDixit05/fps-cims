from django.db import models
from django.conf import settings
import uuid


class Mandi(models.Model):
    """
    Master list of mandis (agricultural markets).
    Pre-loaded reference data.
    """
    name = models.CharField(max_length=200)
    district = models.CharField(max_length=100)
    state = models.CharField(max_length=100)
    is_active = models.BooleanField(default=True)

    class Meta:
        verbose_name_plural = 'Mandis'
        ordering = ['state', 'name']

    def __str__(self):
        return f"{self.name}, {self.state}"


class MandiArrival(models.Model):
    """
    Daily commodity arrival data for a mandi.
    One row = one mandi + one date + one commodity.
    Unique constraint prevents duplicate entries.
    """

    SOURCE_CHOICES = [
        ('trader', 'Trader'),
        ('farmer', 'Farmer'),
        ('official', 'Mandi Official'),
    ]

    # -- Identification --
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    mandi = models.ForeignKey(Mandi, on_delete=models.CASCADE, related_name='arrivals')
    submitted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='mandi_submissions'
    )

    # -- Commodity data --
    commodity = models.CharField(max_length=50, default='Chili')
    date = models.DateField()
    arrival_quantity = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        help_text="Quantity in Quintal"
    )

    # -- Price data --
    avg_rate = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Average rate in ₹ per Quintal"
    )
    min_rate = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    max_rate = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)

    source = models.CharField(max_length=20, choices=SOURCE_CHOICES, default='trader')
    remark = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    local_id = models.CharField(max_length=100, blank=True)  # WatermelonDB offline ID
    approval_status = models.CharField(max_length=30, default='draft')

    class Meta:
        ordering = ['-date']
        unique_together = ['mandi', 'date', 'commodity']  # one entry per mandi per day per commodity

    def __str__(self):
        return f"{self.mandi.name} · {self.date} · {self.arrival_quantity} Qt"
