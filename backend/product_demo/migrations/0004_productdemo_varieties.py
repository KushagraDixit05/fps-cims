from django.db import migrations, models


def backfill_varieties(apps, schema_editor):
    """Existing rows have a single `variety` → seed the new list with it."""
    ProductDemo = apps.get_model('product_demo', 'ProductDemo')
    for demo in ProductDemo.objects.all().iterator(chunk_size=500):
        if not demo.varieties and demo.variety:
            demo.varieties = [demo.variety]
            demo.save(update_fields=['varieties'])


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('product_demo', '0003_demo_phase_nullable_result'),
    ]

    operations = [
        migrations.AddField(
            model_name='productdemo',
            name='varieties',
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.RunPython(backfill_varieties, noop_reverse),
    ]
