from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('crops', '0003_village_master'),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            state_operations=[
                migrations.AddField(
                    model_name='farmervisit',
                    name='approval_status',
                    field=models.CharField(default='draft', max_length=30),
                ),
            ],
            database_operations=[
                # The column may already exist in the DB (added directly as a RBAC prep step).
                # For fresh deployments: create it. For existing DBs: ensure a default is set
                # so ORM INSERTs that omit the column don't hit a NOT NULL violation.
                migrations.RunSQL(
                    sql="""
                        DO $$
                        BEGIN
                            IF NOT EXISTS (
                                SELECT 1 FROM information_schema.columns
                                WHERE table_name = 'crops_farmervisit'
                                  AND column_name = 'approval_status'
                            ) THEN
                                ALTER TABLE crops_farmervisit
                                    ADD COLUMN approval_status VARCHAR(30) NOT NULL DEFAULT 'draft';
                            ELSE
                                ALTER TABLE crops_farmervisit
                                    ALTER COLUMN approval_status SET DEFAULT 'draft';
                            END IF;
                        END $$;
                    """,
                    reverse_sql="ALTER TABLE crops_farmervisit DROP COLUMN IF EXISTS approval_status;",
                ),
            ],
        ),
    ]
