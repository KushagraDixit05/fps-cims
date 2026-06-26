"""
audit/migrations/0002_auditlog_immutability.py
================================================
Enforces append-only semantics at the database level using PostgreSQL RULEs.

The RULEs silently discard any UPDATE or DELETE statement issued against
audit_auditlog and workflow_approvalaction — even from a direct psql session
or Django ORM call that bypasses application logic.

On non-PostgreSQL backends (SQLite in CI, etc.) this migration is a no-op.
"""
from django.db import migrations


def apply_immutability(apps, schema_editor):
    if schema_editor.connection.vendor != 'postgresql':
        return

    rules = [
        # AuditLog — immutable audit trail
        "CREATE OR REPLACE RULE audit_no_update AS "
        "ON UPDATE TO audit_auditlog DO INSTEAD NOTHING;",

        "CREATE OR REPLACE RULE audit_no_delete AS "
        "ON DELETE TO audit_auditlog DO INSTEAD NOTHING;",

        # ApprovalAction — immutable approval audit trail
        "CREATE OR REPLACE RULE approvalaction_no_update AS "
        "ON UPDATE TO workflow_approvalaction DO INSTEAD NOTHING;",

        "CREATE OR REPLACE RULE approvalaction_no_delete AS "
        "ON DELETE TO workflow_approvalaction DO INSTEAD NOTHING;",
    ]
    for sql in rules:
        schema_editor.execute(sql)


def revert_immutability(apps, schema_editor):
    if schema_editor.connection.vendor != 'postgresql':
        return

    drops = [
        "DROP RULE IF EXISTS audit_no_update ON audit_auditlog;",
        "DROP RULE IF EXISTS audit_no_delete ON audit_auditlog;",
        "DROP RULE IF EXISTS approvalaction_no_update ON workflow_approvalaction;",
        "DROP RULE IF EXISTS approvalaction_no_delete ON workflow_approvalaction;",
    ]
    for sql in drops:
        schema_editor.execute(sql)


class Migration(migrations.Migration):

    dependencies = [
        ('audit', '0001_initial'),
        ('workflow', '0002_seed_workflows'),
    ]

    operations = [
        migrations.RunPython(apply_immutability, reverse_code=revert_immutability),
    ]
