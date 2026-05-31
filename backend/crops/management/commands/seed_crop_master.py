# /media/kushagra/crucial/FPS internship/fps/backend/crops/management/commands/seed_crop_master.py
"""
Management command: seed_crop_master

Loads initial crop/variety, district, and block master data into the database.
Safe to run multiple times — uses get_or_create throughout.

Usage:
    python manage.py seed_crop_master
"""

from django.core.management.base import BaseCommand
from crops.models import CropMaster, CropVariety, District, Block


# ── Crop / Variety data ───────────────────────────────────────────────────────

CROP_DATA: list[dict] = [
    {
        'crop_name': 'Chilli',
        'varieties': ['Teja', 'LCA 305', 'G4', 'Byadgi'],
    },
    {
        'crop_name': 'Soybean',
        'varieties': ['JS 9560', 'JS 335', 'NRC 86'],
    },
    {
        'crop_name': 'Pigeon Pea (Tur)',
        'varieties': ['ICPL 87119', 'Maruti', 'Asha'],
    },
    {
        'crop_name': 'Cotton',
        'varieties': ['Bunny BT', 'RCH 2', 'MRC 7017'],
    },
    {
        'crop_name': 'Wheat',
        'varieties': ['GW 322', 'Raj 4120', 'HI 8498'],
    },
    {
        'crop_name': 'Onion',
        'varieties': ['Bhima Kiran', 'Bhima Super', 'Agrifound'],
    },
    {
        'crop_name': 'Maize',
        'varieties': ['NK 6240', 'DKC 9144', 'Bisco 855'],
    },
    {
        'crop_name': 'Tomato',
        'varieties': ['Arka Rakshak', 'Abhinav', 'NS 585'],
    },
]

# ── District / Block data ─────────────────────────────────────────────────────
# Focused on the project's primary target regions: Nanded (MH) and Guntur (AP)

DISTRICT_BLOCK_DATA: list[dict] = [
    {
        'name': 'Nanded',
        'state': 'Maharashtra',
        'blocks': [
            'Ardhapur', 'Bhokar', 'Biloli', 'Deglur', 'Dharmabad',
            'Hadgaon', 'Himayatnagar', 'Kandhar', 'Kinwat',
            'Loha', 'Mudkhed', 'Mukhed', 'Naigaon', 'Nanded',
            'Umri',
        ],
    },
    {
        'name': 'Guntur',
        'state': 'Andhra Pradesh',
        'blocks': [
            'Atchampeta', 'Bapatla', 'Bellamkonda', 'Chilakaluripet',
            'Dachepalle', 'Gurazala', 'Guntur', 'Macherla',
            'Narasaraopet', 'Palnadu', 'Piduguralla', 'Sattenapalle',
            'Tadikonda', 'Veldurthi',
        ],
    },
    {
        'name': 'Indore',
        'state': 'Madhya Pradesh',
        'blocks': [
            'Depalpur', 'Hatod', 'Indore', 'Mhow', 'Sanwer',
        ],
    },
    {
        'name': 'Nagpur',
        'state': 'Maharashtra',
        'blocks': [
            'Bhiwapur', 'Hingna', 'Kamthi', 'Katol', 'Kalmeshwar',
            'Mauda', 'Nagpur Rural', 'Narkhed', 'Parseoni',
            'Ramtek', 'Savner', 'Umred',
        ],
    },
]


class Command(BaseCommand):
    help = 'Seeds initial Crop Master, Crop Variety, District, and Block data'

    def handle(self, *args, **options) -> None:
        self.stdout.write(self.style.MIGRATE_HEADING('\n=== Seeding Crop Master Data ===\n'))
        self._seed_crops()
        self.stdout.write(self.style.MIGRATE_HEADING('\n=== Seeding District & Block Data ===\n'))
        self._seed_districts()
        self.stdout.write(self.style.SUCCESS('\n✅ Seed complete.\n'))

    def _seed_crops(self) -> None:
        total_crops = 0
        total_varieties = 0

        for item in CROP_DATA:
            crop, created = CropMaster.objects.get_or_create(
                crop_name=item['crop_name'],
                defaults={'is_active': True},
            )
            status = 'CREATED' if created else 'EXISTS '
            total_crops += 1

            variety_count = 0
            for variety_name in item['varieties']:
                _, v_created = CropVariety.objects.get_or_create(
                    crop=crop,
                    variety_name=variety_name,
                    defaults={'is_active': True},
                )
                if v_created:
                    variety_count += 1
                    total_varieties += 1

            self.stdout.write(
                f'  [{status}] {crop.crop_name} '
                f'({variety_count} new varieties, {len(item["varieties"])} total)'
            )

        self.stdout.write(
            f'\n  Crops: {total_crops} processed | '
            f'Varieties: {total_varieties} new\n'
        )

    def _seed_districts(self) -> None:
        total_districts = 0
        total_blocks = 0

        for item in DISTRICT_BLOCK_DATA:
            district, created = District.objects.get_or_create(
                name=item['name'],
                defaults={'state': item['state'], 'is_active': True},
            )
            status = 'CREATED' if created else 'EXISTS '
            total_districts += 1

            block_count = 0
            for block_name in item['blocks']:
                _, b_created = Block.objects.get_or_create(
                    name=block_name,
                    district=district,
                    defaults={'is_active': True},
                )
                if b_created:
                    block_count += 1
                    total_blocks += 1

            self.stdout.write(
                f'  [{status}] {district.name}, {district.state} '
                f'({block_count} new blocks, {len(item["blocks"])} total)'
            )

        self.stdout.write(
            f'\n  Districts: {total_districts} processed | '
            f'Blocks: {total_blocks} new\n'
        )
