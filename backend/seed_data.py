from mandi.models import Mandi

# Seed Mandis for CMM Regions
mandis_data = [
    {"name": "Bediya",   "district": "Khargone", "state": "Madhya Pradesh"},
    {"name": "Khammam",  "district": "Khammam",  "state": "Telangana"},
    {"name": "Guntur",   "district": "Guntur",   "state": "Andhra Pradesh"},
    {"name": "Warangal", "district": "Warangal", "state": "Telangana"},
    {"name": "Indore",   "district": "Indore",   "state": "Madhya Pradesh"},
    {"name": "Dhamnod",  "district": "Dhar",     "state": "Madhya Pradesh"},
]

for m in mandis_data:
    Mandi.objects.get_or_create(name=m["name"], district=m["district"], state=m["state"])
    
print(f"Total Mandis in DB: {Mandi.objects.count()}")
