from django.db import migrations


class Migration(migrations.Migration):
    """
    Add GIST spatial indexes and partial indexes on existing tables.
    The geo app owns no models — these indexes live on crops/product_demo/mandi tables.
    """
    dependencies = [
        ('crops', '0005_farmervisit_uniq_farmervisit_executive_local_id'),
        ('product_demo', '0001_initial'),
        ('mandi', '0007_mandi_location'),
    ]

    operations = [
        migrations.RunSQL(
            sql=[
                "CREATE INDEX IF NOT EXISTS farmervisit_location_gix ON crops_farmervisit USING GIST (location);",
                "CREATE INDEX IF NOT EXISTS farmervisit_submitted_idx ON crops_farmervisit (submitted_at);",
                "CREATE INDEX IF NOT EXISTS farmervisit_approved_idx ON crops_farmervisit (submitted_at) WHERE approval_status = 'approved';",
                "CREATE INDEX IF NOT EXISTS farmervisit_district_idx ON crops_farmervisit (district_name);",
                "CREATE INDEX IF NOT EXISTS productdemo_location_gix ON product_demo_productdemo USING GIST (location);",
                "CREATE INDEX IF NOT EXISTS productdemo_submitted_idx ON product_demo_productdemo (submitted_at);",
                "CREATE INDEX IF NOT EXISTS productdemo_approved_idx ON product_demo_productdemo (submitted_at) WHERE approval_status = 'approved';",
                "CREATE INDEX IF NOT EXISTS mandi_location_gix ON mandi_mandi USING GIST (location);",
                "CREATE INDEX IF NOT EXISTS croprecord_crop_idx ON crops_croprecord (crop_name);",
                "CREATE INDEX IF NOT EXISTS croprecord_condition_idx ON crops_croprecord (crop_condition);",
            ],
            reverse_sql=[
                "DROP INDEX IF EXISTS farmervisit_location_gix;",
                "DROP INDEX IF EXISTS farmervisit_submitted_idx;",
                "DROP INDEX IF EXISTS farmervisit_approved_idx;",
                "DROP INDEX IF EXISTS farmervisit_district_idx;",
                "DROP INDEX IF EXISTS productdemo_location_gix;",
                "DROP INDEX IF EXISTS productdemo_submitted_idx;",
                "DROP INDEX IF EXISTS productdemo_approved_idx;",
                "DROP INDEX IF EXISTS mandi_location_gix;",
                "DROP INDEX IF EXISTS croprecord_crop_idx;",
                "DROP INDEX IF EXISTS croprecord_condition_idx;",
            ]
        ),
    ]
