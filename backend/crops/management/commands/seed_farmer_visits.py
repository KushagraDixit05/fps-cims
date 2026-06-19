from datetime import date

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.contrib.gis.geos import Point

from crops.models import FarmerVisit, CropRecord

User = get_user_model()

VISIT_DATA = [
    # Guntur, Andhra Pradesh
    {
        'farmer_name': 'Ravi Kumar', 'mobile_number': '9876543201',
        'village_name': 'Bapatla', 'block_name': 'Bapatla', 'district_name': 'Guntur',
        'total_land_acre': 5.0, 'latitude': 15.9048, 'longitude': 80.4685,
        'remark': 'First visit of season',
        'crop': {'crop_name': 'Chilli', 'variety': 'G4', 'date_of_sowing': date(2026, 1, 15),
                 'current_area_acre': 5.0, 'this_year_area_acre': 5.0,
                 'crop_stage': 'fruiting', 'crop_condition': 'good', 'problems': ['pest']},
    },
    {
        'farmer_name': 'Suresh Reddy', 'mobile_number': '9876543202',
        'village_name': 'Repalle', 'block_name': 'Repalle', 'district_name': 'Guntur',
        'total_land_acre': 8.5, 'latitude': 16.0210, 'longitude': 80.8240,
        'remark': 'Pest pressure high this week',
        'crop': {'crop_name': 'Cotton', 'variety': 'Bunny BT', 'date_of_sowing': date(2025, 11, 10),
                 'current_area_acre': 8.5, 'this_year_area_acre': 8.5,
                 'crop_stage': 'flowering', 'crop_condition': 'average', 'problems': ['pest', 'disease']},
    },
    {
        'farmer_name': 'Venkat Rao', 'mobile_number': '9876543203',
        'village_name': 'Chilakaluripet', 'block_name': 'Chilakaluripet', 'district_name': 'Guntur',
        'total_land_acre': 3.0, 'latitude': 16.0912, 'longitude': 80.1672,
        'remark': 'Good standing crop',
        'crop': {'crop_name': 'Turmeric', 'variety': 'Erode Local', 'date_of_sowing': date(2025, 10, 1),
                 'current_area_acre': 3.0, 'this_year_area_acre': 3.0,
                 'crop_stage': 'vegetative', 'crop_condition': 'good', 'problems': ['labour']},
    },
    {
        'farmer_name': 'Lakshmi Devi', 'mobile_number': '9876543204',
        'village_name': 'Nizampatnam', 'block_name': 'Bapatla', 'district_name': 'Guntur',
        'total_land_acre': 12.0, 'latitude': 15.9022, 'longitude': 80.6530,
        'remark': 'Yield lower than last year',
        'crop': {'crop_name': 'Chilli', 'variety': 'Teja', 'date_of_sowing': date(2025, 12, 20),
                 'current_area_acre': 12.0, 'this_year_area_acre': 12.0,
                 'crop_stage': 'harvesting', 'crop_condition': 'poor', 'problems': ['disease', 'weather', 'price']},
    },
    {
        'farmer_name': 'Prasad Naidu', 'mobile_number': '9876543205',
        'village_name': 'Karlapalem', 'block_name': 'Bapatla', 'district_name': 'Guntur',
        'total_land_acre': 6.5, 'latitude': 15.9500, 'longitude': 80.5100,
        'remark': 'Needs irrigation support',
        'crop': {'crop_name': 'Maize', 'variety': 'Pioneer 3522', 'date_of_sowing': date(2026, 2, 1),
                 'current_area_acre': 6.5, 'this_year_area_acre': 6.5,
                 'crop_stage': 'seedling', 'crop_condition': 'average', 'problems': ['weather']},
    },
    # Indore, Madhya Pradesh
    {
        'farmer_name': 'Ramesh Patidar', 'mobile_number': '9876543206',
        'village_name': 'Mhow', 'block_name': 'Mhow', 'district_name': 'Indore',
        'total_land_acre': 10.0, 'latitude': 22.5519, 'longitude': 75.7633,
        'remark': 'Soybean looking healthy',
        'crop': {'crop_name': 'Soybean', 'variety': 'JS 335', 'date_of_sowing': date(2025, 7, 10),
                 'current_area_acre': 10.0, 'this_year_area_acre': 10.0,
                 'crop_stage': 'post_harvest', 'crop_condition': 'good', 'problems': ['price']},
    },
    {
        'farmer_name': 'Dinesh Malviya', 'mobile_number': '9876543207',
        'village_name': 'Depalpur', 'block_name': 'Depalpur', 'district_name': 'Indore',
        'total_land_acre': 7.0, 'latitude': 22.8477, 'longitude': 75.5467,
        'remark': 'Wheat standing well',
        'crop': {'crop_name': 'Wheat', 'variety': 'GW 496', 'date_of_sowing': date(2025, 11, 25),
                 'current_area_acre': 7.0, 'this_year_area_acre': 7.0,
                 'crop_stage': 'vegetative', 'crop_condition': 'good', 'problems': ['labour']},
    },
    {
        'farmer_name': 'Sunita Chouhan', 'mobile_number': '9876543208',
        'village_name': 'Sanwer', 'block_name': 'Sanwer', 'district_name': 'Indore',
        'total_land_acre': 4.5, 'latitude': 22.9744, 'longitude': 75.8325,
        'remark': 'Onion affected by thrips',
        'crop': {'crop_name': 'Onion', 'variety': 'Agrifound Rose', 'date_of_sowing': date(2025, 12, 10),
                 'current_area_acre': 4.5, 'this_year_area_acre': 4.5,
                 'crop_stage': 'vegetative', 'crop_condition': 'poor', 'problems': ['pest', 'disease']},
    },
    {
        'farmer_name': 'Mahesh Sharma', 'mobile_number': '9876543209',
        'village_name': 'Hatod', 'block_name': 'Hatod', 'district_name': 'Indore',
        'total_land_acre': 9.0, 'latitude': 22.7230, 'longitude': 75.9080,
        'remark': 'Good rabi crop',
        'crop': {'crop_name': 'Wheat', 'variety': 'Lok 1', 'date_of_sowing': date(2025, 12, 1),
                 'current_area_acre': 9.0, 'this_year_area_acre': 9.0,
                 'crop_stage': 'flowering', 'crop_condition': 'good', 'problems': ['labour']},
    },
    {
        'farmer_name': 'Geeta Bai', 'mobile_number': '9876543210',
        'village_name': 'Limbodi', 'block_name': 'Mhow', 'district_name': 'Indore',
        'total_land_acre': 2.5, 'latitude': 22.6011, 'longitude': 75.8100,
        'remark': 'Small holding, mixed crop',
        'crop': {'crop_name': 'Soybean', 'variety': 'NRC 37', 'date_of_sowing': date(2025, 7, 20),
                 'current_area_acre': 2.5, 'this_year_area_acre': 2.5,
                 'crop_stage': 'harvesting', 'crop_condition': 'average', 'problems': ['weather', 'price']},
    },
    # Nagpur, Maharashtra
    {
        'farmer_name': 'Vijay Deshmukh', 'mobile_number': '9876543211',
        'village_name': 'Katol', 'block_name': 'Katol', 'district_name': 'Nagpur',
        'total_land_acre': 15.0, 'latitude': 21.2711, 'longitude': 78.5807,
        'remark': 'Large orange orchard',
        'crop': {'crop_name': 'Orange', 'variety': 'Nagpur Mandarin', 'date_of_sowing': date(2024, 6, 15),
                 'current_area_acre': 15.0, 'this_year_area_acre': 15.0,
                 'crop_stage': 'fruiting', 'crop_condition': 'good', 'problems': ['pest']},
    },
    {
        'farmer_name': 'Priya Wankhede', 'mobile_number': '9876543212',
        'village_name': 'Kamptee', 'block_name': 'Kamptee', 'district_name': 'Nagpur',
        'total_land_acre': 6.0, 'latitude': 21.2180, 'longitude': 79.1950,
        'remark': 'Cotton boll worm attack',
        'crop': {'crop_name': 'Cotton', 'variety': 'Mahyco MRC 7351', 'date_of_sowing': date(2025, 7, 5),
                 'current_area_acre': 6.0, 'this_year_area_acre': 6.0,
                 'crop_stage': 'fruiting', 'crop_condition': 'poor', 'problems': ['pest', 'disease', 'labour']},
    },
    {
        'farmer_name': 'Sunil Thakre', 'mobile_number': '9876543213',
        'village_name': 'Hingna', 'block_name': 'Hingna', 'district_name': 'Nagpur',
        'total_land_acre': 8.0, 'latitude': 21.1234, 'longitude': 78.9780,
        'remark': 'Good soybean harvest expected',
        'crop': {'crop_name': 'Soybean', 'variety': 'JS 9305', 'date_of_sowing': date(2025, 6, 25),
                 'current_area_acre': 8.0, 'this_year_area_acre': 8.0,
                 'crop_stage': 'post_harvest', 'crop_condition': 'good', 'problems': ['price']},
    },
    {
        'farmer_name': 'Anita Meshram', 'mobile_number': '9876543214',
        'village_name': 'Parseoni', 'block_name': 'Parseoni', 'district_name': 'Nagpur',
        'total_land_acre': 4.0, 'latitude': 21.4820, 'longitude': 79.3610,
        'remark': 'Powdery mildew on chilli',
        'crop': {'crop_name': 'Chilli', 'variety': 'Bydagi', 'date_of_sowing': date(2025, 12, 15),
                 'current_area_acre': 4.0, 'this_year_area_acre': 4.0,
                 'crop_stage': 'flowering', 'crop_condition': 'average', 'problems': ['disease']},
    },
    {
        'farmer_name': 'Raju Nandanwar', 'mobile_number': '9876543215',
        'village_name': 'Umred', 'block_name': 'Umred', 'district_name': 'Nagpur',
        'total_land_acre': 11.0, 'latitude': 20.8590, 'longitude': 79.3140,
        'remark': 'Delayed sowing due to rain',
        'crop': {'crop_name': 'Cotton', 'variety': 'Ajeet 155', 'date_of_sowing': date(2025, 8, 1),
                 'current_area_acre': 11.0, 'this_year_area_acre': 11.0,
                 'crop_stage': 'vegetative', 'crop_condition': 'average', 'problems': ['weather', 'labour']},
    },
    # Nanded, Maharashtra
    {
        'farmer_name': 'Maruti Patil', 'mobile_number': '9876543216',
        'village_name': 'Ardhapur', 'block_name': 'Ardhapur', 'district_name': 'Nanded',
        'total_land_acre': 9.5, 'latitude': 18.9830, 'longitude': 77.6560,
        'remark': 'Turmeric crop doing well',
        'crop': {'crop_name': 'Turmeric', 'variety': 'Rajapuri', 'date_of_sowing': date(2025, 6, 1),
                 'current_area_acre': 9.5, 'this_year_area_acre': 9.5,
                 'crop_stage': 'vegetative', 'crop_condition': 'good', 'problems': ['labour']},
    },
    {
        'farmer_name': 'Shanta Jadhav', 'mobile_number': '9876543217',
        'village_name': 'Bhokar', 'block_name': 'Bhokar', 'district_name': 'Nanded',
        'total_land_acre': 5.0, 'latitude': 18.8440, 'longitude': 77.6680,
        'remark': 'Soybean yield poor this year',
        'crop': {'crop_name': 'Soybean', 'variety': 'Phule Kalyani', 'date_of_sowing': date(2025, 7, 15),
                 'current_area_acre': 5.0, 'this_year_area_acre': 5.0,
                 'crop_stage': 'post_harvest', 'crop_condition': 'poor', 'problems': ['weather', 'price', 'other']},
    },
    {
        'farmer_name': 'Devidas Kamble', 'mobile_number': '9876543218',
        'village_name': 'Hadgaon', 'block_name': 'Hadgaon', 'district_name': 'Nanded',
        'total_land_acre': 7.5, 'latitude': 19.4920, 'longitude': 77.6590,
        'remark': 'Cotton yield average',
        'crop': {'crop_name': 'Cotton', 'variety': 'RCH 650 BG II', 'date_of_sowing': date(2025, 7, 20),
                 'current_area_acre': 7.5, 'this_year_area_acre': 7.5,
                 'crop_stage': 'harvesting', 'crop_condition': 'average', 'problems': ['pest']},
    },
    {
        'farmer_name': 'Savita More', 'mobile_number': '9876543219',
        'village_name': 'Kinwat', 'block_name': 'Kinwat', 'district_name': 'Nanded',
        'total_land_acre': 3.5, 'latitude': 19.6230, 'longitude': 78.2010,
        'remark': 'Small onion plot, market price low',
        'crop': {'crop_name': 'Onion', 'variety': 'Baswant 780', 'date_of_sowing': date(2025, 12, 5),
                 'current_area_acre': 3.5, 'this_year_area_acre': 3.5,
                 'crop_stage': 'vegetative', 'crop_condition': 'average', 'problems': ['price']},
    },
    {
        'farmer_name': 'Vishwas Kulkarni', 'mobile_number': '9876543220',
        'village_name': 'Mukhed', 'block_name': 'Mukhed', 'district_name': 'Nanded',
        'total_land_acre': 13.0, 'latitude': 17.7150, 'longitude': 77.6710,
        'remark': 'Mixed crop, disease pressure',
        'crop': {'crop_name': 'Chilli', 'variety': 'Sankeshwari', 'date_of_sowing': date(2026, 1, 10),
                 'current_area_acre': 13.0, 'this_year_area_acre': 13.0,
                 'crop_stage': 'seedling', 'crop_condition': 'poor', 'problems': ['disease', 'pest', 'labour']},
    },

    # ── Batch 2 (entries 21–40) ───────────────────────────────────────────────

    # Guntur, Andhra Pradesh
    {
        'farmer_name': 'Srikanth Babu', 'mobile_number': '9876543221',
        'village_name': 'Tenali', 'block_name': 'Tenali', 'district_name': 'Guntur',
        'total_land_acre': 7.0, 'latitude': 16.2429, 'longitude': 80.6409,
        'remark': 'Cotton looking healthy this season',
        'crop': {'crop_name': 'Cotton', 'variety': 'Bunny BT', 'date_of_sowing': date(2025, 7, 12),
                 'current_area_acre': 7.0, 'this_year_area_acre': 7.0,
                 'crop_stage': 'harvesting', 'crop_condition': 'good', 'problems': ['price']},
    },
    {
        'farmer_name': 'Padmavathi', 'mobile_number': '9876543222',
        'village_name': 'Narasaraopet', 'block_name': 'Narasaraopet', 'district_name': 'Guntur',
        'total_land_acre': 4.0, 'latitude': 16.2355, 'longitude': 80.0490,
        'remark': 'Chilli affected by leaf curl',
        'crop': {'crop_name': 'Chilli', 'variety': 'LCA 334', 'date_of_sowing': date(2025, 12, 18),
                 'current_area_acre': 4.0, 'this_year_area_acre': 4.0,
                 'crop_stage': 'flowering', 'crop_condition': 'average', 'problems': ['pest', 'labour']},
    },
    {
        'farmer_name': 'Hanumantha Rao', 'mobile_number': '9876543223',
        'village_name': 'Sattenapalle', 'block_name': 'Sattenapalle', 'district_name': 'Guntur',
        'total_land_acre': 9.0, 'latitude': 16.3950, 'longitude': 80.1520,
        'remark': 'Maize crop in good condition',
        'crop': {'crop_name': 'Maize', 'variety': 'DKC 9144', 'date_of_sowing': date(2026, 1, 20),
                 'current_area_acre': 9.0, 'this_year_area_acre': 9.0,
                 'crop_stage': 'vegetative', 'crop_condition': 'good', 'problems': ['weather']},
    },
    {
        'farmer_name': 'Nagamani', 'mobile_number': '9876543224',
        'village_name': 'Macherla', 'block_name': 'Macherla', 'district_name': 'Guntur',
        'total_land_acre': 3.5, 'latitude': 16.4760, 'longitude': 79.4310,
        'remark': 'Turmeric rhizome rot observed',
        'crop': {'crop_name': 'Turmeric', 'variety': 'BSR 1', 'date_of_sowing': date(2025, 6, 10),
                 'current_area_acre': 3.5, 'this_year_area_acre': 3.5,
                 'crop_stage': 'harvesting', 'crop_condition': 'poor', 'problems': ['disease', 'other']},
    },
    {
        'farmer_name': 'Appa Rao', 'mobile_number': '9876543225',
        'village_name': 'Piduguralla', 'block_name': 'Piduguralla', 'district_name': 'Guntur',
        'total_land_acre': 11.0, 'latitude': 16.4710, 'longitude': 79.8830,
        'remark': 'Moderate pest activity',
        'crop': {'crop_name': 'Cotton', 'variety': 'RCH 2 BG II', 'date_of_sowing': date(2025, 8, 5),
                 'current_area_acre': 11.0, 'this_year_area_acre': 11.0,
                 'crop_stage': 'fruiting', 'crop_condition': 'average', 'problems': ['pest']},
    },

    # Indore, Madhya Pradesh
    {
        'farmer_name': 'Kailash Verma', 'mobile_number': '9876543226',
        'village_name': 'Rajendra Nagar', 'block_name': 'Indore', 'district_name': 'Indore',
        'total_land_acre': 5.5, 'latitude': 22.7196, 'longitude': 75.8577,
        'remark': 'Garlic export quality, good price expected',
        'crop': {'crop_name': 'Garlic', 'variety': 'Yamuna Safed', 'date_of_sowing': date(2025, 11, 1),
                 'current_area_acre': 5.5, 'this_year_area_acre': 5.5,
                 'crop_stage': 'vegetative', 'crop_condition': 'good', 'problems': ['price']},
    },
    {
        'farmer_name': 'Priti Joshi', 'mobile_number': '9876543227',
        'village_name': 'Palda', 'block_name': 'Indore', 'district_name': 'Indore',
        'total_land_acre': 6.0, 'latitude': 22.6814, 'longitude': 75.8682,
        'remark': 'Wheat yield impacted by unseasonal rain',
        'crop': {'crop_name': 'Wheat', 'variety': 'MP 3288', 'date_of_sowing': date(2025, 12, 5),
                 'current_area_acre': 6.0, 'this_year_area_acre': 6.0,
                 'crop_stage': 'flowering', 'crop_condition': 'average', 'problems': ['labour', 'weather']},
    },
    {
        'farmer_name': 'Santosh Yadav', 'mobile_number': '9876543228',
        'village_name': 'Simrol', 'block_name': 'Mhow', 'district_name': 'Indore',
        'total_land_acre': 8.0, 'latitude': 22.4830, 'longitude': 75.8920,
        'remark': 'Soybean good harvest, storage needed',
        'crop': {'crop_name': 'Soybean', 'variety': 'MACS 1188', 'date_of_sowing': date(2025, 7, 5),
                 'current_area_acre': 8.0, 'this_year_area_acre': 8.0,
                 'crop_stage': 'post_harvest', 'crop_condition': 'good', 'problems': ['price']},
    },
    {
        'farmer_name': 'Rekha Rathore', 'mobile_number': '9876543229',
        'village_name': 'Betma', 'block_name': 'Depalpur', 'district_name': 'Indore',
        'total_land_acre': 3.0, 'latitude': 22.7920, 'longitude': 75.6440,
        'remark': 'Onion downy mildew affecting crop',
        'crop': {'crop_name': 'Onion', 'variety': 'N-2-4-1', 'date_of_sowing': date(2025, 12, 20),
                 'current_area_acre': 3.0, 'this_year_area_acre': 3.0,
                 'crop_stage': 'seedling', 'crop_condition': 'poor', 'problems': ['disease', 'pest']},
    },
    {
        'farmer_name': 'Mohan Patel', 'mobile_number': '9876543230',
        'village_name': 'Manpur', 'block_name': 'Mhow', 'district_name': 'Indore',
        'total_land_acre': 7.5, 'latitude': 22.5290, 'longitude': 75.7140,
        'remark': 'Second wheat crop, irrigation adequate',
        'crop': {'crop_name': 'Wheat', 'variety': 'GW 322', 'date_of_sowing': date(2025, 11, 28),
                 'current_area_acre': 7.5, 'this_year_area_acre': 7.5,
                 'crop_stage': 'vegetative', 'crop_condition': 'average', 'problems': ['weather']},
    },

    # Nagpur, Maharashtra
    {
        'farmer_name': 'Ramrao Bhoyar', 'mobile_number': '9876543231',
        'village_name': 'Kalmeshwar', 'block_name': 'Kalmeshwar', 'district_name': 'Nagpur',
        'total_land_acre': 10.0, 'latitude': 21.2242, 'longitude': 78.9095,
        'remark': 'Cotton well managed, labour cost high',
        'crop': {'crop_name': 'Cotton', 'variety': 'Nuziveedu Brahma', 'date_of_sowing': date(2025, 7, 8),
                 'current_area_acre': 10.0, 'this_year_area_acre': 10.0,
                 'crop_stage': 'fruiting', 'crop_condition': 'good', 'problems': ['labour']},
    },
    {
        'farmer_name': 'Vandana Gawande', 'mobile_number': '9876543232',
        'village_name': 'Butibori', 'block_name': 'Hingna', 'district_name': 'Nagpur',
        'total_land_acre': 6.5, 'latitude': 21.0110, 'longitude': 79.0670,
        'remark': 'Soybean affected by excess rain',
        'crop': {'crop_name': 'Soybean', 'variety': 'JS 335', 'date_of_sowing': date(2025, 6, 28),
                 'current_area_acre': 6.5, 'this_year_area_acre': 6.5,
                 'crop_stage': 'post_harvest', 'crop_condition': 'average', 'problems': ['weather', 'price']},
    },
    {
        'farmer_name': 'Narendra Sontakke', 'mobile_number': '9876543233',
        'village_name': 'Saoner', 'block_name': 'Saoner', 'district_name': 'Nagpur',
        'total_land_acre': 14.0, 'latitude': 21.3770, 'longitude': 78.9250,
        'remark': 'Orange orchard, good fruit set',
        'crop': {'crop_name': 'Orange', 'variety': 'Khasi Mandarin', 'date_of_sowing': date(2024, 5, 20),
                 'current_area_acre': 14.0, 'this_year_area_acre': 14.0,
                 'crop_stage': 'fruiting', 'crop_condition': 'good', 'problems': ['pest']},
    },
    {
        'farmer_name': 'Lata Kolhe', 'mobile_number': '9876543234',
        'village_name': 'Narkhed', 'block_name': 'Narkhed', 'district_name': 'Nagpur',
        'total_land_acre': 8.5, 'latitude': 21.4480, 'longitude': 78.5770,
        'remark': 'Fusarium wilt spreading in cotton',
        'crop': {'crop_name': 'Cotton', 'variety': 'Ajeet 199', 'date_of_sowing': date(2025, 7, 18),
                 'current_area_acre': 8.5, 'this_year_area_acre': 8.5,
                 'crop_stage': 'vegetative', 'crop_condition': 'poor', 'problems': ['disease', 'labour']},
    },
    {
        'farmer_name': 'Bhaskar Ingle', 'mobile_number': '9876543235',
        'village_name': 'Ramtek', 'block_name': 'Ramtek', 'district_name': 'Nagpur',
        'total_land_acre': 5.0, 'latitude': 21.3946, 'longitude': 79.3177,
        'remark': 'Turmeric intercrop with soybean',
        'crop': {'crop_name': 'Turmeric', 'variety': 'Rajapuri', 'date_of_sowing': date(2025, 6, 5),
                 'current_area_acre': 5.0, 'this_year_area_acre': 5.0,
                 'crop_stage': 'vegetative', 'crop_condition': 'average', 'problems': ['pest', 'weather']},
    },

    # Nanded, Maharashtra
    {
        'farmer_name': 'Ganpat Shinde', 'mobile_number': '9876543236',
        'village_name': 'Deglur', 'block_name': 'Deglur', 'district_name': 'Nanded',
        'total_land_acre': 12.0, 'latitude': 17.8920, 'longitude': 77.5560,
        'remark': 'Cotton price good, sold at Nanded mandi',
        'crop': {'crop_name': 'Cotton', 'variety': 'RCH 650 BG II', 'date_of_sowing': date(2025, 7, 22),
                 'current_area_acre': 12.0, 'this_year_area_acre': 12.0,
                 'crop_stage': 'harvesting', 'crop_condition': 'good', 'problems': ['price']},
    },
    {
        'farmer_name': 'Kalavati Pawar', 'mobile_number': '9876543237',
        'village_name': 'Naigaon', 'block_name': 'Naigaon', 'district_name': 'Nanded',
        'total_land_acre': 4.5, 'latitude': 18.8530, 'longitude': 77.3240,
        'remark': 'Soybean standing but rain delayed harvest',
        'crop': {'crop_name': 'Soybean', 'variety': 'Phule Agaon', 'date_of_sowing': date(2025, 7, 10),
                 'current_area_acre': 4.5, 'this_year_area_acre': 4.5,
                 'crop_stage': 'harvesting', 'crop_condition': 'average', 'problems': ['weather']},
    },
    {
        'farmer_name': 'Pandharinath More', 'mobile_number': '9876543238',
        'village_name': 'Biloli', 'block_name': 'Biloli', 'district_name': 'Nanded',
        'total_land_acre': 6.0, 'latitude': 18.7650, 'longitude': 77.7300,
        'remark': 'Chilli crop hit by virus and price crash',
        'crop': {'crop_name': 'Chilli', 'variety': 'Warangal Chapata', 'date_of_sowing': date(2026, 1, 5),
                 'current_area_acre': 6.0, 'this_year_area_acre': 6.0,
                 'crop_stage': 'seedling', 'crop_condition': 'poor', 'problems': ['pest', 'disease', 'price']},
    },
    {
        'farmer_name': 'Sulochana Jagtap', 'mobile_number': '9876543239',
        'village_name': 'Kandhar', 'block_name': 'Kandhar', 'district_name': 'Nanded',
        'total_land_acre': 8.0, 'latitude': 18.2720, 'longitude': 77.5220,
        'remark': 'Turmeric for local processing unit',
        'crop': {'crop_name': 'Turmeric', 'variety': 'Salem', 'date_of_sowing': date(2025, 6, 15),
                 'current_area_acre': 8.0, 'this_year_area_acre': 8.0,
                 'crop_stage': 'vegetative', 'crop_condition': 'good', 'problems': ['labour']},
    },
    {
        'farmer_name': 'Vitthal Desai', 'mobile_number': '9876543240',
        'village_name': 'Loha', 'block_name': 'Loha', 'district_name': 'Nanded',
        'total_land_acre': 9.0, 'latitude': 18.0730, 'longitude': 77.0990,
        'remark': 'Cotton affected by unseasonal hailstorm',
        'crop': {'crop_name': 'Cotton', 'variety': 'Mahyco MRC 6918', 'date_of_sowing': date(2025, 8, 10),
                 'current_area_acre': 9.0, 'this_year_area_acre': 9.0,
                 'crop_stage': 'fruiting', 'crop_condition': 'average', 'problems': ['weather', 'pest']},
    },
]


class Command(BaseCommand):
    help = 'Seeds 20 FarmerVisit test entries across Guntur, Indore, Nagpur, and Nanded'

    def handle(self, *args, **options):
        executive = User.objects.filter(is_superuser=True).first()
        if not executive:
            self.stdout.write(self.style.ERROR('No superuser found. Run: python manage.py createsuperuser'))
            return

        created = 0
        skipped = 0

        for entry in VISIT_DATA:
            crop_data = entry.pop('crop')

            visit, was_created = FarmerVisit.objects.get_or_create(
                mobile_number=entry['mobile_number'],
                defaults={
                    **entry,
                    'executive': executive,
                    'location': Point(entry['longitude'], entry['latitude']),
                    'approval_status': 'approved',
                    'is_synced': True,
                },
            )

            # Re-insert crop key for next iteration safety
            entry['crop'] = crop_data

            if was_created:
                CropRecord.objects.create(
                    visit=visit,
                    last_year_area_acre=crop_data['current_area_acre'],
                    sort_order=0,
                    **crop_data,
                )
                created += 1
                self.stdout.write(f"  Created: {visit.farmer_name} ({visit.district_name})")
            else:
                skipped += 1

        self.stdout.write(self.style.SUCCESS(
            f'\nDone. Created {created} visits, skipped {skipped} existing.'
        ))
