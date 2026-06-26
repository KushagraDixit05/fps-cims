from celery import shared_task


@shared_task(name='workflow.check_approval_escalations')
def check_approval_escalations():
    from workflow.services.escalation_service import EscalationService
    return EscalationService.check_and_escalate()
