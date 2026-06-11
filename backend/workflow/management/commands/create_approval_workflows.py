from django.core.management.base import BaseCommand
from workflow.models import ApprovalWorkflow

APPROVER_ROLES = ['checker', 'regional_head', 'manager', 'admin', 'super_admin']

WORKFLOWS = [
    {
        'name': 'Crop Monitoring Visit Approval',
        'module': 'crop_monitoring',
        'model_name': 'FarmerVisit',
        'approver_role_codes': APPROVER_ROLES,
        'escalation_hours': 48,
    },
    {
        'name': 'Mandi Arrival Approval',
        'module': 'mandi',
        'model_name': 'MandiArrival',
        'approver_role_codes': APPROVER_ROLES,
        'escalation_hours': 24,
    },
    {
        'name': 'Product Demo Approval',
        'module': 'product_demo',
        'model_name': 'ProductDemo',
        'approver_role_codes': APPROVER_ROLES,
        'escalation_hours': 48,
    },
]


class Command(BaseCommand):
    help = 'Seed ApprovalWorkflow records for all modules (idempotent)'

    def handle(self, *args, **options):
        created_count = 0
        for data in WORKFLOWS:
            obj, created = ApprovalWorkflow.objects.update_or_create(
                module=data['module'],
                model_name=data['model_name'],
                defaults={
                    'name': data['name'],
                    'approver_role_codes': data['approver_role_codes'],
                    'escalation_hours': data['escalation_hours'],
                    'is_active': True,
                },
            )
            if created:
                created_count += 1
                self.stdout.write(self.style.SUCCESS(f"Created: {obj.name}"))
            else:
                self.stdout.write(f"Updated: {obj.name}")

        self.stdout.write(self.style.SUCCESS(
            f"\nDone. {created_count} created, {len(WORKFLOWS) - created_count} updated."
        ))
