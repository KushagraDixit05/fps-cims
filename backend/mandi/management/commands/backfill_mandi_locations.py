"""
Backfills Mandi.location from a district-centroid lookup.

Usage:
  python manage.py backfill_mandi_locations

For each Mandi that has no location but has a matching District in crops_district,
sets location to the centroid of all FarmerVisit records in that district.
"""
from django.core.management.base import BaseCommand
from django.contrib.gis.db.models.functions import Centroid
from django.contrib.gis.db.models.aggregates import Collect
from mandi.models import Mandi
from crops.models import FarmerVisit


class Command(BaseCommand):
    help = 'Backfill Mandi.location from district visit centroids'

    def handle(self, *args, **options):
        # Build district_name → centroid from FarmerVisit
        district_centroids = {}
        rows = (
            FarmerVisit.objects.filter(location__isnull=False)
            .values('district_name')
            .annotate(centroid=Centroid(Collect('location')))
        )
        for row in rows:
            if row['centroid']:
                district_centroids[row['district_name'].lower()] = row['centroid']

        updated = 0
        skipped = 0
        for mandi in Mandi.objects.filter(location__isnull=True):
            key = mandi.district.lower()
            centroid = district_centroids.get(key)
            if centroid:
                mandi.location = centroid
                mandi.save(update_fields=['location'])
                updated += 1
            else:
                skipped += 1

        self.stdout.write(
            self.style.SUCCESS(
                f'Backfill complete: {updated} mandis updated, {skipped} skipped (no visit data for district).'
            )
        )
