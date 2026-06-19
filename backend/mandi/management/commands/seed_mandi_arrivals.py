from datetime import date

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

from mandi.models import Mandi, MandiArrival

User = get_user_model()

ARRIVAL_DATA = [
    # Guntur Mandi, Andhra Pradesh — Chilli & Cotton
    {'mandi_name': 'Guntur', 'commodity': 'Chilli',  'date': date(2026, 1, 6),
     'arrival_quantity': 185.00, 'avg_rate': 15200.00, 'min_rate': 13800.00, 'max_rate': 16800.00,
     'source': 'trader',    'remark': 'Premium Teja variety, good colour'},
    {'mandi_name': 'Guntur', 'commodity': 'Chilli',  'date': date(2026, 1, 20),
     'arrival_quantity': 210.00, 'avg_rate': 14500.00, 'min_rate': 13000.00, 'max_rate': 16000.00,
     'source': 'trader',    'remark': 'LCA 334 variety, moderate demand'},
    {'mandi_name': 'Guntur', 'commodity': 'Cotton',  'date': date(2026, 2, 3),
     'arrival_quantity': 320.00, 'avg_rate': 6800.00,  'min_rate': 6400.00,  'max_rate': 7200.00,
     'source': 'fps_staff', 'remark': 'Kapas arrivals from Bapatla belt'},
    {'mandi_name': 'Guntur', 'commodity': 'Chilli',  'date': date(2026, 2, 17),
     'arrival_quantity': 150.00, 'avg_rate': 16200.00, 'min_rate': 14500.00, 'max_rate': 17800.00,
     'source': 'official',  'remark': 'Post-harvest peak, export quality'},
    {'mandi_name': 'Guntur', 'commodity': 'Maize',   'date': date(2026, 3, 5),
     'arrival_quantity': 540.00, 'avg_rate': 2050.00,  'min_rate': 1950.00,  'max_rate': 2150.00,
     'source': 'farmer',    'remark': 'Rabi maize from Sattenapalle block'},

    # Warangal Mandi, Telangana — Chilli & Cotton
    {'mandi_name': 'Warangal', 'commodity': 'Chilli',  'date': date(2026, 1, 10),
     'arrival_quantity': 120.00, 'avg_rate': 14800.00, 'min_rate': 13200.00, 'max_rate': 16200.00,
     'source': 'trader',    'remark': 'Warangal Chapata local variety'},
    {'mandi_name': 'Warangal', 'commodity': 'Cotton',  'date': date(2026, 1, 25),
     'arrival_quantity': 280.00, 'avg_rate': 6600.00,  'min_rate': 6200.00,  'max_rate': 7000.00,
     'source': 'mandi',     'remark': 'End-of-season cotton liquidation'},
    {'mandi_name': 'Warangal', 'commodity': 'Soybean', 'date': date(2026, 2, 8),
     'arrival_quantity': 420.00, 'avg_rate': 4450.00,  'min_rate': 4200.00,  'max_rate': 4700.00,
     'source': 'fps_staff', 'remark': 'Stored stock arriving; quality fair'},

    # Khammam Mandi, Telangana — Chilli & Cotton
    {'mandi_name': 'Khammam', 'commodity': 'Chilli',  'date': date(2026, 1, 15),
     'arrival_quantity': 95.00,  'avg_rate': 13500.00, 'min_rate': 12000.00, 'max_rate': 15000.00,
     'source': 'trader',    'remark': 'Mixed grade arrivals'},
    {'mandi_name': 'Khammam', 'commodity': 'Cotton',  'date': date(2026, 2, 2),
     'arrival_quantity': 190.00, 'avg_rate': 6500.00,  'min_rate': 6100.00,  'max_rate': 6900.00,
     'source': 'farmer',    'remark': 'Smallholder direct arrivals'},
    {'mandi_name': 'Khammam', 'commodity': 'Maize',   'date': date(2026, 3, 12),
     'arrival_quantity': 380.00, 'avg_rate': 1980.00,  'min_rate': 1880.00,  'max_rate': 2080.00,
     'source': 'trader',    'remark': 'Feed-grade maize for poultry industry'},

    # Indore Mandi, Madhya Pradesh — Soybean, Wheat, Onion
    {'mandi_name': 'Indore', 'commodity': 'Soybean', 'date': date(2025, 11, 5),
     'arrival_quantity': 780.00, 'avg_rate': 4550.00,  'min_rate': 4300.00,  'max_rate': 4800.00,
     'source': 'trader',    'remark': 'Kharif soybean arrivals post-harvest'},
    {'mandi_name': 'Indore', 'commodity': 'Wheat',   'date': date(2026, 4, 8),
     'arrival_quantity': 1850.00,'avg_rate': 2450.00,  'min_rate': 2250.00,  'max_rate': 2650.00,
     'source': 'official',  'remark': 'Rabi wheat procurement season'},
    {'mandi_name': 'Indore', 'commodity': 'Onion',   'date': date(2026, 2, 22),
     'arrival_quantity': 620.00, 'avg_rate': 2200.00,  'min_rate': 1900.00,  'max_rate': 2600.00,
     'source': 'fps_staff', 'remark': 'Supply surge from Manpur belt'},
    {'mandi_name': 'Indore', 'commodity': 'Maize',   'date': date(2026, 3, 18),
     'arrival_quantity': 950.00, 'avg_rate': 2100.00,  'min_rate': 1980.00,  'max_rate': 2220.00,
     'source': 'trader',    'remark': 'Large trader consolidation lot'},

    # Bediya Mandi, Khargone, Madhya Pradesh — Soybean & Cotton
    {'mandi_name': 'Bediya', 'commodity': 'Soybean', 'date': date(2025, 10, 28),
     'arrival_quantity': 350.00, 'avg_rate': 4280.00,  'min_rate': 4100.00,  'max_rate': 4500.00,
     'source': 'farmer',    'remark': 'Early Kharif soybean, moisture high'},
    {'mandi_name': 'Bediya', 'commodity': 'Cotton',  'date': date(2025, 12, 10),
     'arrival_quantity': 160.00, 'avg_rate': 6350.00,  'min_rate': 5900.00,  'max_rate': 6800.00,
     'source': 'trader',    'remark': 'Nimar cotton, good staple length'},
    {'mandi_name': 'Bediya', 'commodity': 'Wheat',   'date': date(2026, 4, 15),
     'arrival_quantity': 1200.00,'avg_rate': 2380.00,  'min_rate': 2200.00,  'max_rate': 2560.00,
     'source': 'fps_staff', 'remark': 'MSP procurement observed'},

    # Dhamnod Mandi, Dhar, Madhya Pradesh — Soybean & Wheat
    {'mandi_name': 'Dhamnod', 'commodity': 'Soybean', 'date': date(2025, 11, 18),
     'arrival_quantity': 490.00, 'avg_rate': 4620.00,  'min_rate': 4400.00,  'max_rate': 4850.00,
     'source': 'trader',    'remark': 'Export-grade lot, clean and dry'},
    {'mandi_name': 'Dhamnod', 'commodity': 'Wheat',   'date': date(2026, 4, 22),
     'arrival_quantity': 2100.00,'avg_rate': 2520.00,  'min_rate': 2350.00,  'max_rate': 2700.00,
     'source': 'official',  'remark': 'Government procurement centre, 147 qt MSP'},
    {'mandi_name': 'Dhamnod', 'commodity': 'Maize',   'date': date(2026, 3, 28),
     'arrival_quantity': 720.00, 'avg_rate': 2080.00,  'min_rate': 1960.00,  'max_rate': 2200.00,
     'source': 'trader',    'remark': 'Starch industry buyer bulk lot'},
]


class Command(BaseCommand):
    help = 'Seed mandi arrival entries for testing'

    def handle(self, *args, **options):
        exec_user = User.objects.filter(is_superuser=True).first()
        if not exec_user:
            self.stdout.write(self.style.ERROR('No superuser found. Run createsuperuser first.'))
            return

        created = skipped = 0
        for d in ARRIVAL_DATA:
            mandi = Mandi.objects.filter(name=d['mandi_name']).first()
            if not mandi:
                self.stdout.write(self.style.WARNING(f"Mandi '{d['mandi_name']}' not found — skipping"))
                skipped += 1
                continue

            _, is_new = MandiArrival.objects.get_or_create(
                mandi=mandi,
                date=d['date'],
                commodity=d['commodity'],
                defaults={
                    'submitted_by':    exec_user,
                    'arrival_quantity': d['arrival_quantity'],
                    'avg_rate':         d['avg_rate'],
                    'min_rate':         d['min_rate'],
                    'max_rate':         d['max_rate'],
                    'source':           d['source'],
                    'remark':           d['remark'],
                    'approval_status':  'draft',
                },
            )
            if is_new:
                created += 1
            else:
                skipped += 1

        self.stdout.write(self.style.SUCCESS(f'Mandi arrivals — Created: {created}, Skipped: {skipped}'))
