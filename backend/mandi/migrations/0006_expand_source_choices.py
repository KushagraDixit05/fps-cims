from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('mandi', '0005_custom_source'),
    ]

    operations = [
        migrations.AlterField(
            model_name='mandiarrival',
            name='source',
            field=models.CharField(choices=[('trader', 'Trader'), ('farmer', 'Farmer'), ('fps_staff', 'FPS Staff'), ('mandi', 'Mandi'), ('official', 'Mandi Official'), ('other', 'Other')], default='trader', max_length=20),
        ),
    ]
