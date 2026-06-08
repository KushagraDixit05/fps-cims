from mandi.models import Mandi

# Seed Mandis for CMM Regions
mandis_data = [
    {"name": "Nanded Mandi", "district": "Nanded", "state": "Maharashtra"},
    {"name": "Loha Mandi", "district": "Nanded", "state": "Maharashtra"},
    
    {"name": "Guntur Mirchi Yard", "district": "Guntur", "state": "Andhra Pradesh"},
    {"name": "Narasaraopet Mandi", "district": "Guntur", "state": "Andhra Pradesh"},
    
    {"name": "Indore Choithram Mandi", "district": "Indore", "state": "Madhya Pradesh"},
    {"name": "Mhow Mandi", "district": "Indore", "state": "Madhya Pradesh"},
    
    {"name": "Kalamna Market", "district": "Nagpur", "state": "Maharashtra"},
    {"name": "Katol Mandi", "district": "Nagpur", "state": "Maharashtra"}
]

for m in mandis_data:
    Mandi.objects.get_or_create(name=m["name"], district=m["district"], state=m["state"])
    
print(f"Total Mandis in DB: {Mandi.objects.count()}")
