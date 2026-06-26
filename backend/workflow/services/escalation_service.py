"""
EscalationService — finds ApprovalInstances past their SLA and escalates them.

Called by the hourly Celery beat task in workflow/tasks.py.
"""

from django.db import models
from django.utils import timezone


class EscalationService:

    @staticmethod
    def check_and_escalate():
        from workflow.models import ApprovalInstance
        from workflow.services.approval_engine import ApprovalEngine

        # Use RawSQL to compare submitted_at + escalation_hours against now().
        # Django ORM cannot add an integer (hours) from a related field to a datetime.
        overdue = ApprovalInstance.objects.filter(
            status__in=['submitted', 'resubmitted'],
        ).annotate(
            deadline=models.ExpressionWrapper(
                models.F('submitted_at') + models.ExpressionWrapper(
                    models.F('workflow__escalation_hours') * models.Value(3600),
                    output_field=models.DurationField(),
                ),
                output_field=models.DateTimeField(),
            )
        ).filter(deadline__lt=timezone.now()).select_related('workflow', 'submitted_by')

        escalated_count = 0
        for instance in overdue:
            try:
                regional_head = EscalationService._find_regional_head(instance)
                ApprovalEngine.escalate(instance)
                if regional_head:
                    instance.escalated_to = regional_head
                    instance.current_approver = regional_head
                    instance.save(update_fields=['escalated_to', 'current_approver'])
                escalated_count += 1
            except Exception:
                # Never let one bad escalation abort the whole batch
                pass

        return escalated_count

    @staticmethod
    def _find_regional_head(instance):
        """Return the first active regional_head user whose state matches the source record."""
        from django.contrib.auth import get_user_model
        User = get_user_model()

        # Try to get the source model's state for region matching
        source_state = None
        try:
            source = instance.content_type.get_object_for_this_type(pk=instance.object_id)
            source_state = getattr(source, 'state', None) or getattr(source, 'district_name', None)
        except Exception:
            pass

        qs = User.objects.filter(
            is_active=True,
            primary_role__code='regional_head',
        )
        if source_state:
            qs = qs.filter(state=source_state)

        return qs.first()
