from django.contrib.gis.db import models as gis_models
import django.contrib.gis.db.models.fields
from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ('mandi', '0006_expand_source_choices'),
    ]

    operations = [
        migrations.AddField(
            model_name='mandi',
            name='location',
            field=django.contrib.gis.db.models.fields.PointField(blank=True, null=True, srid=4326),
        ),
    ]
