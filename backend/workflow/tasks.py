import logging

from celery import shared_task
from django.utils import timezone

logger = logging.getLogger(__name__)


@shared_task(name='workflow.check_approval_escalations')
def check_approval_escalations():
    from workflow.services.escalation_service import EscalationService
    return EscalationService.check_and_escalate()


@shared_task(name='workflow.notify_unactioned_escalations')
def notify_unactioned_escalations():
    """
    Phase 8 monitoring alert — runs every 30 minutes.

    Finds ApprovalInstances that have been in 'escalated' status for more than
    24 hours without any approver action, and:
      1. Writes an AuditLog entry with event_type='alert'.
      2. Emails Django ADMINS via mail_admins() for human follow-up.

    Returns a count of instances found for Celery beat logging.
    """
    from datetime import timedelta

    from django.core.mail import mail_admins

    from audit.engine import AuditEngine
    from workflow.models import ApprovalInstance

    cutoff = timezone.now() - timedelta(hours=24)
    stale = ApprovalInstance.objects.filter(
        status='escalated',
        escalated_at__lt=cutoff,
    ).select_related('workflow', 'submitted_by')

    count = stale.count()
    if count == 0:
        return 0

    ids = list(stale.values_list('id', flat=True))
    summary = f'{count} escalated approval(s) unactioned for >24h. IDs: {ids[:10]}'

    logger.warning('MONITORING ALERT — %s', summary)

    # Write to audit trail for visibility in the admin portal audit log.
    AuditEngine.log(
        request=None,
        event_type='alert',
        action='unactioned_escalation',
        module='workflow',
        changes={'count': count, 'instance_ids': [str(i) for i in ids[:10]]},
    )

    try:
        mail_admins(
            subject=f'[FPS Alert] {count} escalated approval(s) need attention',
            message=(
                f'{summary}\n\n'
                'Please log in to the admin portal to review and action these approvals.\n'
                f'Escalated at or before: {cutoff.isoformat()}'
            ),
        )
    except Exception:
        logger.exception('notify_unactioned_escalations: mail_admins failed')

    return count
