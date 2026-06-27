"""
ApprovalEngine — state machine for the maker-checker approval workflow.

All methods are @staticmethod so callers don't need to instantiate the class.
Each method validates the transition, updates the ApprovalInstance, syncs the
approval_status back to the source submission model, and appends an ApprovalAction
and AuditLog entry.
"""

from django.core.exceptions import ValidationError
from django.utils import timezone

_TERMINAL = frozenset({'approved', 'rejected', 'cancelled'})

_VALID_TRANSITIONS = {
    'submit':           (frozenset({'draft'}),                        'submitted'),
    'start_review':     (frozenset({'submitted', 'resubmitted', 'escalated'}), 'under_review'),
    'approve':          (frozenset({'under_review'}),                 'approved'),
    'reject':           (frozenset({'under_review'}),                 'rejected'),
    'request_revision': (frozenset({'under_review'}),                 'revision_requested'),
    'resubmit':         (frozenset({'revision_requested'}),           'resubmitted'),
    'cancel':           (frozenset({'draft'}),                        'cancelled'),
    'escalate':         (frozenset({'submitted', 'resubmitted'}),     'escalated'),
    'force_approve':    (frozenset({'submitted', 'under_review', 'resubmitted',
                                    'revision_requested', 'escalated'}), 'approved'),
}


class ApprovalEngine:

    # ─────────────────────────────────────────────────────────────────── public ─

    @staticmethod
    def submit(instance, actor, snapshot=None):
        ApprovalEngine._transition(instance, 'submit', actor, '')
        if snapshot is not None:
            instance.data_snapshot = snapshot
            instance.save(update_fields=['data_snapshot'])

    @staticmethod
    def start_review(instance, actor):
        ApprovalEngine._transition(instance, 'start_review', actor, '')
        if instance.current_approver is None:
            instance.current_approver = actor
            instance.save(update_fields=['current_approver'])

    @staticmethod
    def approve(instance, actor, comment=''):
        ApprovalEngine._transition(instance, 'approve', actor, comment)

    @staticmethod
    def reject(instance, actor, comment):
        if not comment or not comment.strip():
            raise ValidationError({'comment': 'A comment is required when rejecting.'})
        ApprovalEngine._transition(instance, 'reject', actor, comment)

    @staticmethod
    def request_revision(instance, actor, comment):
        if not comment or not comment.strip():
            raise ValidationError({'comment': 'A comment is required when requesting revision.'})
        instance.revision_count += 1
        instance.revision_note = comment
        instance.save(update_fields=['revision_count', 'revision_note'])
        ApprovalEngine._transition(instance, 'request_revision', actor, comment)

    @staticmethod
    def resubmit(instance, actor, snapshot=None):
        ApprovalEngine._transition(instance, 'resubmit', actor, '')
        if snapshot is not None:
            instance.data_snapshot = snapshot
            instance.save(update_fields=['data_snapshot'])

    @staticmethod
    def cancel(instance, actor):
        ApprovalEngine._transition(instance, 'cancel', actor, '')

    @staticmethod
    def escalate(instance):
        # System action — actor is the submitter as a proxy (no interactive user)
        ApprovalEngine._transition(instance, 'escalate', instance.submitted_by, '')
        instance.escalated_at = timezone.now()
        instance.save(update_fields=['escalated_at'])

    @staticmethod
    def force_approve(instance, actor, comment=''):
        ApprovalEngine._transition(instance, 'force_approve', actor, comment)

    @staticmethod
    def reassign(instance, actor, new_approver):
        """Assign a new current_approver without changing status."""
        instance.current_approver = new_approver
        instance.save(update_fields=['current_approver', 'updated_at'])
        ApprovalEngine._write_action(instance, actor, 'commented',
                                     f'Reassigned to {new_approver.get_full_name() or new_approver.username}')
        ApprovalEngine._write_audit(instance, actor, 'reassigned', '')

    # ──────────────────────────────────────────────────────────────── internals ─

    @staticmethod
    def _transition(instance, transition_name, actor, comment):
        valid_from, new_status = _VALID_TRANSITIONS[transition_name]
        if instance.status not in valid_from:
            raise ValidationError(
                f"Cannot '{transition_name}' an instance in '{instance.status}' status. "
                f"Allowed: {sorted(valid_from)}."
            )
        old_status = instance.status
        instance.status = new_status

        now = timezone.now()
        if new_status == 'approved':
            instance.approved_at = now
            instance.approved_by = actor
        elif new_status == 'rejected':
            instance.rejected_at = now
            instance.rejected_by = actor

        instance.save(update_fields=['status', 'approved_at', 'approved_by',
                                     'rejected_at', 'rejected_by', 'updated_at'])

        # Map transition names to action codes used in ApprovalAction
        action_code_map = {
            'submit':           'submitted',
            'start_review':     'started_review',
            'approve':          'approved',
            'reject':           'rejected',
            'request_revision': 'requested_revision',
            'resubmit':         'resubmitted',
            'cancel':           'cancelled',
            'escalate':         'escalated',
            'force_approve':    'approved',
        }
        action_code = action_code_map[transition_name]

        ApprovalEngine._sync_source_model(instance)
        ApprovalEngine._write_action(instance, actor, action_code, comment)
        ApprovalEngine._write_audit(instance, actor, action_code, comment,
                                    old_status=old_status)

    @staticmethod
    def _sync_source_model(instance):
        """Mirror approval_status (and approved_at) back to the source submission record."""
        try:
            source = instance.content_type.get_object_for_this_type(pk=instance.object_id)
        except Exception:
            return
        update_fields = []
        if hasattr(source, 'approval_status'):
            source.approval_status = instance.status
            update_fields.append('approval_status')
        if hasattr(source, 'approved_at'):
            source.approved_at = instance.approved_at
            update_fields.append('approved_at')
        if update_fields:
            source.save(update_fields=update_fields)

    @staticmethod
    def _write_action(instance, actor, action_code, comment):
        from workflow.models import ApprovalAction
        ApprovalAction.objects.create(
            instance=instance,
            actor=actor,
            action=action_code,
            comment=comment or '',
        )

    @staticmethod
    def _write_audit(instance, actor, action_code, comment, old_status=None, request=None):
        try:
            from audit.models import AuditLog
            changes = {}
            if old_status is not None:
                changes['status'] = [old_status, instance.status]

            AuditLog.objects.create(
                actor=actor,
                actor_username=actor.username if actor else 'system',
                actor_role=(getattr(getattr(actor, 'primary_role', None), 'code', '') or
                            getattr(actor, 'role', '')) if actor else '',
                actor_ip=getattr(request, '_fps_actor_ip', None) if request else None,
                event_type='approval_action',
                module=instance.workflow.module,
                action=action_code,
                content_type=instance.content_type,
                object_id=str(instance.object_id),
                object_repr=str(instance),
                changes={**changes, **(({'comment': comment} if comment else {}))},
                request_id=getattr(request, '_fps_request_id', None) if request else None,
            )
        except Exception:
            # Audit writes must never break the approval flow
            pass
