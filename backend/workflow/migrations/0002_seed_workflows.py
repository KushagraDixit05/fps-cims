"""Seed the three approval workflow templates (Crop Visit, Mandi Arrival,
Product Demo) per docs/rbac/05-APPROVAL-WORKFLOW.md. Reversible."""
from django.db import migrations

# (name, module, model_name, approver_role_codes, escalation_hours)
WORKFLOWS = [
    ('Crop Visit Approval', 'crop_monitoring', 'FarmerVisit',
     ['checker', 'regional_head', 'manager', 'admin', 'super_admin'], 48),
    ('Mandi Arrival Approval', 'mandi', 'MandiArrival',
     ['checker', 'regional_head', 'manager', 'admin', 'super_admin'], 24),
    ('Product Demo Approval', 'product_demo', 'ProductDemo',
     ['checker', 'regional_head', 'admin', 'super_admin'], 72),
]

WORKFLOW_NAMES = [w[0] for w in WORKFLOWS]


def seed(apps, schema_editor):
    ApprovalWorkflow = apps.get_model('workflow', 'ApprovalWorkflow')
    for name, module, model_name, approvers, escalation in WORKFLOWS:
        ApprovalWorkflow.objects.update_or_create(
            name=name,
            defaults={
                'module': module,
                'model_name': model_name,
                'trigger_condition': {},
                'require_all': False,
                'approver_role_codes': approvers,
                'escalation_hours': escalation,
                'is_active': True,
            },
        )


def unseed(apps, schema_editor):
    ApprovalWorkflow = apps.get_model('workflow', 'ApprovalWorkflow')
    ApprovalWorkflow.objects.filter(name__in=WORKFLOW_NAMES).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('workflow', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(seed, unseed),
    ]
