from celery import shared_task
from django.utils import timezone


@shared_task
def check_approval_escalations():
    from workflow.models import ApprovalInstance
    from workflow.services.escalation_service import EscalationService

    now = timezone.now()
    pending = ApprovalInstance.objects.filter(
        status__in=['submitted', 'under_review'],
    ).select_related('workflow', 'submitted_by')

    escalated = 0
    for instance in pending:
        hours = (now - instance.submitted_at).total_seconds() / 3600
        if hours >= instance.workflow.escalation_hours:
            EscalationService.escalate(instance)
            escalated += 1

    return f"Escalated {escalated} instances"
