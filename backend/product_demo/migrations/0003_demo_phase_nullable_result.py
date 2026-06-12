from django.db import migrations, models


def set_phase_from_result(apps, schema_editor):
    """Existing rows already carry a result → mark them completed."""
    ProductDemo = apps.get_model('product_demo', 'ProductDemo')
    ProductDemo.objects.exclude(demo_result__isnull=True).exclude(
        demo_result=''
    ).update(demo_phase='completed')


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('product_demo', '0002_productdemo_approval_status'),
    ]

    operations = [
        migrations.AlterField(
            model_name='productdemo',
            name='demo_result',
            field=models.CharField(
                max_length=20, null=True, blank=True,
                choices=[
                    ('excellent', 'Excellent'),
                    ('good', 'Good'),
                    ('average', 'Average'),
                    ('poor', 'Poor'),
                    ('no_effect', 'No Effect'),
                ],
            ),
        ),
        migrations.AddField(
            model_name='productdemo',
            name='demo_phase',
            field=models.CharField(
                max_length=20, default='before',
                choices=[
                    ('before', 'Before — awaiting result'),
                    ('completed', 'Completed'),
                ],
            ),
        ),
        migrations.RunPython(set_phase_from_result, noop_reverse),
    ]
