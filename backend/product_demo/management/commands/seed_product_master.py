"""
Management command: seed_product_master

Seeds the ProductMaster table with common agrochemical products.
Idempotent — safe to run multiple times (uses get_or_create).

Usage:
    python manage.py seed_product_master
"""

from django.core.management.base import BaseCommand
from product_demo.models import ProductMaster

PRODUCTS = [
    # Insecticides
    ('Acephate 75% SP',              'Insecticide'),
    ('Chlorpyrifos 20% EC',          'Insecticide'),
    ('Cypermethrin 10% EC',          'Insecticide'),
    ('Dimethoate 30% EC',            'Insecticide'),
    ('Emamectin Benzoate 5% SG',     'Insecticide'),
    ('Imidacloprid 17.8% SL',        'Insecticide'),
    ('Lambda Cyhalothrin 5% EC',     'Insecticide'),
    ('Monocrotophos 36% SL',         'Insecticide'),
    ('Profenofos 50% EC',            'Insecticide'),
    ('Spinosad 45% SC',              'Insecticide'),
    ('Thiamethoxam 25% WG',          'Insecticide'),
    # Fungicides
    ('Azoxystrobin 23% SC',          'Fungicide'),
    ('Carbendazim 50% WP',           'Fungicide'),
    ('Hexaconazole 5% SC',           'Fungicide'),
    ('Mancozeb 75% WP',              'Fungicide'),
    ('Metalaxyl 8% + Mancozeb 64% WP', 'Fungicide'),
    ('Propiconazole 25% EC',         'Fungicide'),
    ('Tebuconazole 25.9% EC',        'Fungicide'),
    ('Thiram 75% WP',                'Fungicide'),
    ('Tricyclazole 75% WP',          'Fungicide'),
]


class Command(BaseCommand):
    help = 'Seed ProductMaster with common agrochemical products'

    def handle(self, *args, **options):
        created = 0
        for name, category in PRODUCTS:
            _, was_created = ProductMaster.objects.get_or_create(
                name=name,
                defaults={'category': category, 'is_active': True},
            )
            if was_created:
                created += 1

        self.stdout.write(
            self.style.SUCCESS(
                f'Done. {created} new products seeded ({len(PRODUCTS) - created} already existed).'
            )
        )
