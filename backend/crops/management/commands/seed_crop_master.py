# /media/kushagra/crucial/FPS internship/fps/backend/crops/management/commands/seed_crop_master.py
"""
Management command: seed_crop_master

Loads initial crop/variety, district, and block master data into the database.
Safe to run multiple times — uses get_or_create throughout.

Usage:
    python manage.py seed_crop_master
"""

from django.core.management.base import BaseCommand
from crops.models import CropMaster, CropVariety, District, Block, VillageMaster


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

# ── Village data (linked to blocks) ─────────────────────────────────────────
VILLAGE_DATA: list[dict] = [
    # Nanded
    { 'block': 'Nanded',     'district': 'Nanded', 'villages': ['Vishnupuri', 'Shivajinagar', 'Nanded Gaon', 'Vazirabad'] },
    { 'block': 'Ardhapur',   'district': 'Nanded', 'villages': ['Ardhapur', 'Pangri', 'Khadgaon', 'Shirla'] },
    { 'block': 'Mudkhed',    'district': 'Nanded', 'villages': ['Mudkhed', 'Danori', 'Bela', 'Khandala'] },
    { 'block': 'Loha',       'district': 'Nanded', 'villages': ['Loha', 'Kalam', 'Borwand', 'Sawari'] },
    { 'block': 'Deglur',     'district': 'Nanded', 'villages': ['Deglur', 'Yedshi', 'Selu', 'Bolsa'] },
    { 'block': 'Biloli',     'district': 'Nanded', 'villages': ['Biloli', 'Amlegaon', 'Dhoki', 'Pimpri'] },
    { 'block': 'Bhokar',     'district': 'Nanded', 'villages': ['Bhokar', 'Chincholi', 'Wari', 'Naigaon BK'] },
    { 'block': 'Hadgaon',    'district': 'Nanded', 'villages': ['Hadgaon', 'Tamsa', 'Khadgaon Bk', 'Latur Road'] },
    { 'block': 'Kinwat',     'district': 'Nanded', 'villages': ['Kinwat', 'Dhanora', 'Manar', 'Talni'] },
    { 'block': 'Mukhed',     'district': 'Nanded', 'villages': ['Mukhed', 'Kanhergaon', 'Nalegaon', 'Ujlamb'] },
    # Guntur
    { 'block': 'Guntur',          'district': 'Guntur', 'villages': ['Guntur Village', 'Arundalpet', 'Pattabhipuram', 'Brodipet'] },
    { 'block': 'Narasaraopet',    'district': 'Guntur', 'villages': ['Narasaraopet', 'Kakani', 'Nuzendla', 'Dachepalle Rd'] },
    { 'block': 'Sattenapalle',    'district': 'Guntur', 'villages': ['Sattenapalle', 'Vinukonda', 'Ipur', 'Phirangipuram'] },
    { 'block': 'Chilakaluripet',  'district': 'Guntur', 'villages': ['Chilakaluripet', 'Pedakurapadu', 'Muppalla', 'Rajupalem'] },
    { 'block': 'Bapatla',         'district': 'Guntur', 'villages': ['Bapatla', 'Repalle', 'Karlapalem', 'Nizampatnam'] },
    # Indore
    { 'block': 'Indore',    'district': 'Indore', 'villages': ['Rajendra Nagar', 'Limbodi', 'Kanadiya', 'Chambal'] },
    { 'block': 'Sanwer',    'district': 'Indore', 'villages': ['Sanwer', 'Hatod', 'Nemawar', 'Jalud'] },
    { 'block': 'Mhow',      'district': 'Indore', 'villages': ['Mhow', 'Manpur', 'Khargone Rd', 'Khandwa Rd'] },
    { 'block': 'Depalpur',  'district': 'Indore', 'villages': ['Depalpur', 'Bardari', 'Kali Bildi', 'Pipaliya'] },
    # Nagpur
    { 'block': 'Katol',      'district': 'Nagpur', 'villages': ['Katol', 'Savner Rd', 'Rohna', 'Khairi'] },
    { 'block': 'Savner',     'district': 'Nagpur', 'villages': ['Savner', 'Kuhi', 'Tarsa', 'Navegaon'] },
    { 'block': 'Narkhed',    'district': 'Nagpur', 'villages': ['Narkhed', 'Kalmeshwar Rd', 'Borgaon', 'Warud'] },
    { 'block': 'Hingna',     'district': 'Nagpur', 'villages': ['Hingna', 'Butibori', 'Wadi', 'Khapri'] },
    { 'block': 'Mauda',      'district': 'Nagpur', 'villages': ['Mauda', 'Parseoni', 'Ramtek Rd', 'Wihirgaon'] },
    { 'block': 'Umred',      'district': 'Nagpur', 'villages': ['Umred', 'Bhiwapur', 'Kamthi Rd', 'Talegaon'] },
]


class Command(BaseCommand):
    help = 'Seeds initial Crop Master, Crop Variety, District, and Block data'

    def handle(self, *args, **options) -> None:
        self.stdout.write(self.style.MIGRATE_HEADING('\n=== Seeding Crop Master Data ===\n'))
        self._seed_crops()
        self.stdout.write(self.style.MIGRATE_HEADING('\n=== Seeding District & Block Data ===\n'))
        self._seed_districts()
        self.stdout.write(self.style.MIGRATE_HEADING('\n=== Seeding Village Master Data ===\n'))
        self._seed_villages()
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

    def _seed_villages(self) -> None:
        total_villages = 0

        for item in VILLAGE_DATA:
            try:
                district = District.objects.get(name=item['district'])
                block = Block.objects.get(name=item['block'], district=district)
            except (District.DoesNotExist, Block.DoesNotExist):
                self.stdout.write(
                    self.style.WARNING(f'  [SKIP] Block {item["block"]} / District {item["district"]} not found')
                )
                continue

            village_count = 0
            for village_name in item['villages']:
                _, created = VillageMaster.objects.get_or_create(
                    name=village_name,
                    block=block,
                    defaults={'is_active': True},
                )
                if created:
                    village_count += 1
                    total_villages += 1

            self.stdout.write(
                f'  {block.name} ({district.name}): {village_count} new villages'
            )

        self.stdout.write(
            f'\n  Villages: {total_villages} new\n'
        )
