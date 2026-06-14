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
    ('Armet',         ''),
    ('Aster',         ''),
    ('Avenger',       ''),
    ('FPS 11:11:08',  ''),
    ('FPS Boron',     ''),
    ('FPS Quat',      ''),
    ('FPS Tara',      ''),
    ('FPS Zinc',      ''),
    ('Guardian Gold', ''),
    ('Mania',         ''),
    ('Narvi',         ''),
    ('Neo Super',     ''),
    ('Omega',         ''),
    ('Plutus 58',     ''),
    ('Proton',        ''),
    ('Reaper',        ''),
    ('Samurai',       ''),
    ('Stinger',       ''),
    ('Torpedo',       ''),
    ('TOTAL',         ''),
    ('Trident',       ''),
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
