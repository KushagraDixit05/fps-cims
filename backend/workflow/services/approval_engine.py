from django.contrib.contenttypes.models import ContentType
from django.core.exceptions import PermissionDenied
from django.core.exceptions import ValidationError
from django.utils import timezone

from workflow.models import ApprovalInstance, ApprovalAction, ApprovalWorkflow


class ApprovalEngine:

    @classmethod
    def create_instance(cls, workflow: ApprovalWorkflow, obj, submitted_by) -> ApprovalInstance:
        ct = ContentType.objects.get_for_model(obj)
        instance = ApprovalInstance.objects.create(
            workflow=workflow,
            content_type=ct,
            object_id=str(obj.pk),
            submitted_by=submitted_by,
            status='submitted',
            data_snapshot=cls._snapshot(obj),
        )
        cls._log_action(instance, submitted_by, 'submitted')
        return instance

    @classmethod
    def approve(cls, instance: ApprovalInstance, actor, comment: str = '') -> ApprovalInstance:
        cls._assert_status(instance, ['submitted', 'under_review', 'resubmitted'])
        cls._assert_can_approve(actor, instance)

        instance.status = 'approved'
        instance.approved_at = timezone.now()
        instance.approved_by = actor
        instance.save(update_fields=['status', 'approved_at', 'approved_by', 'updated_at'])

        cls._log_action(instance, actor, 'approved', comment)
        return instance

    @classmethod
    def reject(cls, instance: ApprovalInstance, actor, comment: str) -> ApprovalInstance:
        if not comment:
            raise ValidationError("Rejection reason is required.")
        cls._assert_status(instance, ['submitted', 'under_review', 'resubmitted'])
        cls._assert_can_approve(actor, instance)

        instance.status = 'rejected'
        instance.rejected_at = timezone.now()
        instance.rejected_by = actor
        instance.save(update_fields=['status', 'rejected_at', 'rejected_by', 'updated_at'])

        cls._log_action(instance, actor, 'rejected', comment)
        return instance

    @classmethod
    def request_revision(cls, instance: ApprovalInstance, actor, comment: str) -> ApprovalInstance:
        if not comment:
            raise ValidationError("Revision instructions are required.")
        cls._assert_status(instance, ['submitted', 'under_review', 'resubmitted'])

        instance.status = 'revision_requested'
        instance.revision_count += 1
        instance.revision_note = comment
        instance.save(update_fields=['status', 'revision_count', 'revision_note', 'updated_at'])

        cls._log_action(instance, actor, 'requested_revision', comment)
        return instance

    @classmethod
    def resubmit(cls, instance: ApprovalInstance, actor, comment: str = '') -> ApprovalInstance:
        cls._assert_status(instance, ['revision_requested'])
        if instance.submitted_by_id != actor.id:
            raise PermissionDenied("Only the original submitter can resubmit.")

        instance.status = 'resubmitted'
        instance.save(update_fields=['status', 'updated_at'])

        cls._log_action(instance, actor, 'resubmitted', comment)
        return instance

    @classmethod
    def escalate(cls, instance: ApprovalInstance, actor=None, escalated_to=None) -> ApprovalInstance:
        instance.status = 'escalated'
        instance.escalated_at = timezone.now()
        if escalated_to:
            instance.escalated_to = escalated_to
        instance.save(update_fields=['status', 'escalated_at', 'escalated_to', 'updated_at'])
        cls._log_action(instance, actor or instance.submitted_by, 'escalated')
        return instance

    # --- Private helpers ---

    @staticmethod
    def _assert_status(instance, allowed):
        if instance.status not in allowed:
            raise ValidationError(f"Action not allowed in status: {instance.status}")

    @staticmethod
    def _assert_can_approve(actor, instance):
        approver_codes = instance.workflow.approver_role_codes or []
        role_code = actor.primary_role.code if actor.primary_role_id else actor.role
        if role_code not in approver_codes:
            raise PermissionDenied("You are not authorized to approve this entry.")

    @staticmethod
    def _log_action(instance, actor, action, comment=''):
        ApprovalAction.objects.create(
            instance=instance,
            actor=actor,
            action=action,
            comment=comment,
        )

    @staticmethod
    def _snapshot(obj) -> dict:
        try:
            from django.forms.models import model_to_dict
            data = model_to_dict(obj)
            return {k: str(v) for k, v in data.items()}
        except Exception:
            return {}
