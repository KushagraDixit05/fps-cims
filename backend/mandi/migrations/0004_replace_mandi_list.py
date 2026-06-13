from django.db import migrations


NEW_MANDIS = [
    {"name": "Bediya",   "district": "Khargone", "state": "Madhya Pradesh"},
    {"name": "Khammam",  "district": "Khammam",  "state": "Telangana"},
    {"name": "Guntur",   "district": "Guntur",   "state": "Andhra Pradesh"},
    {"name": "Warangal", "district": "Warangal", "state": "Telangana"},
    {"name": "Indore",   "district": "Indore",   "state": "Madhya Pradesh"},
    {"name": "Dhamnod",  "district": "Dhar",     "state": "Madhya Pradesh"},
]


def replace_mandis(apps, schema_editor):
    Mandi = apps.get_model('mandi', 'Mandi')

    # Deactivate every existing mandi. Linked MandiArrival history is preserved
    # (no rows are deleted); old mandis simply disappear from pickers/filters.
    Mandi.objects.update(is_active=False)

    # Insert / reactivate the new master list.
    for m in NEW_MANDIS:
        Mandi.objects.update_or_create(
            name=m["name"],
            district=m["district"],
            state=m["state"],
            defaults={"is_active": True},
        )


def noop_reverse(apps, schema_editor):
    # Non-destructive: nothing to undo.
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('mandi', '0003_mandiarrival_uniq_mandiarrival_submittedby_local_id'),
    ]

    operations = [
        migrations.RunPython(replace_mandis, noop_reverse),
    ]
