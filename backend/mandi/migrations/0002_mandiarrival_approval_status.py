from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('mandi', '0001_initial'),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            state_operations=[
                migrations.AddField(
                    model_name='mandiarrival',
                    name='approval_status',
                    field=models.CharField(default='draft', max_length=30),
                ),
            ],
            database_operations=[
                migrations.RunSQL(
                    sql="""
                        DO $$
                        BEGIN
                            IF NOT EXISTS (
                                SELECT 1 FROM information_schema.columns
                                WHERE table_name = 'mandi_mandiarrival'
                                  AND column_name = 'approval_status'
                            ) THEN
                                ALTER TABLE mandi_mandiarrival
                                    ADD COLUMN approval_status VARCHAR(30) NOT NULL DEFAULT 'draft';
                            ELSE
                                ALTER TABLE mandi_mandiarrival
                                    ALTER COLUMN approval_status SET DEFAULT 'draft';
                            END IF;
                        END $$;
                    """,
                    reverse_sql="ALTER TABLE mandi_mandiarrival DROP COLUMN IF EXISTS approval_status;",
                ),
            ],
        ),
    ]
