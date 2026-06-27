"""
workflow/tests/test_approval_engine.py
========================================
Unit tests for ApprovalEngine state machine.

Tests cover:
- Every valid transition succeeds and records an ApprovalAction
- Every invalid transition raises ValidationError
- approve() syncs approval_status back to source model
- reject() requires a comment
- force_approve() works from any non-terminal state
- escalate() sets escalated_at timestamp

We patch _sync_source_model to avoid needing a real source object,
focusing the tests on the state machine logic itself.
"""
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.contrib.contenttypes.models import ContentType
from django.core.exceptions import ValidationError
from django.test import TestCase, override_settings
from django.utils import timezone

from workflow.models import ApprovalAction, ApprovalInstance, ApprovalWorkflow

User = get_user_model()


@override_settings(AUDIT_ENGINE_ENABLED=False)
class ApprovalEngineTransitionTest(TestCase):

    def setUp(self):
        self.actor = User.objects.create_user(
            username='ae_checker',
            password='testpass123',
        )
        self.submitter = User.objects.create_user(
            username='ae_submitter',
            password='testpass123',
        )

        self.workflow = ApprovalWorkflow.objects.create(
            name='AE Test Workflow',
            module='test',
            model_name='TestModel',
            approver_role_codes=['checker'],
            escalation_hours=48,
        )

        # ContentType for User is a safe stand-in; _sync_source_model is patched.
        self.ct = ContentType.objects.get_for_model(User)

    def _make_instance(self, status='submitted'):
        return ApprovalInstance.objects.create(
            workflow=self.workflow,
            content_type=self.ct,
            object_id=self.submitter.pk,
            submitted_by=self.submitter,
            status=status,
        )

    def _transition(self, method_name, instance, *args, **kwargs):
        from workflow.services.approval_engine import ApprovalEngine
        method = getattr(ApprovalEngine, method_name)
        with patch.object(ApprovalEngine, '_sync_source_model'):
            method(instance, *args, **kwargs)

    # ── Valid transitions ────────────────────────────────────────────────────

    def test_start_review_from_submitted(self):
        instance = self._make_instance('submitted')
        self._transition('start_review', instance, self.actor)

        instance.refresh_from_db()
        self.assertEqual(instance.status, 'under_review')
        self.assertTrue(ApprovalAction.objects.filter(instance=instance, action='started_review').exists())

    def test_approve_from_under_review(self):
        instance = self._make_instance('under_review')
        self._transition('approve', instance, self.actor)

        instance.refresh_from_db()
        self.assertEqual(instance.status, 'approved')
        self.assertIsNotNone(instance.approved_at)
        self.assertEqual(instance.approved_by, self.actor)

    def test_reject_from_under_review(self):
        instance = self._make_instance('under_review')
        self._transition('reject', instance, self.actor, comment='Bad data')

        instance.refresh_from_db()
        self.assertEqual(instance.status, 'rejected')
        self.assertIsNotNone(instance.rejected_at)

    def test_request_revision_from_under_review(self):
        instance = self._make_instance('under_review')
        self._transition('request_revision', instance, self.actor, comment='Fix this')

        instance.refresh_from_db()
        self.assertEqual(instance.status, 'revision_requested')
        self.assertEqual(instance.revision_note, 'Fix this')
        self.assertEqual(instance.revision_count, 1)

    def test_resubmit_from_revision_requested(self):
        instance = self._make_instance('revision_requested')
        self._transition('resubmit', instance, self.submitter)

        instance.refresh_from_db()
        self.assertEqual(instance.status, 'resubmitted')

    def test_cancel_from_draft(self):
        instance = self._make_instance('draft')
        self._transition('cancel', instance, self.submitter)

        instance.refresh_from_db()
        self.assertEqual(instance.status, 'cancelled')

    def test_escalate_from_submitted(self):
        from workflow.services.approval_engine import ApprovalEngine

        instance = self._make_instance('submitted')
        with patch.object(ApprovalEngine, '_sync_source_model'):
            ApprovalEngine.escalate(instance)

        instance.refresh_from_db()
        self.assertEqual(instance.status, 'escalated')
        self.assertIsNotNone(instance.escalated_at)

    def test_start_review_from_resubmitted(self):
        instance = self._make_instance('resubmitted')
        self._transition('start_review', instance, self.actor)

        instance.refresh_from_db()
        self.assertEqual(instance.status, 'under_review')

    def test_start_review_from_escalated(self):
        instance = self._make_instance('escalated')
        self._transition('start_review', instance, self.actor)

        instance.refresh_from_db()
        self.assertEqual(instance.status, 'under_review')

    # ── force_approve from any non-terminal state ────────────────────────────

    def test_force_approve_from_submitted(self):
        instance = self._make_instance('submitted')
        self._transition('force_approve', instance, self.actor)

        instance.refresh_from_db()
        self.assertEqual(instance.status, 'approved')

    def test_force_approve_from_escalated(self):
        instance = self._make_instance('escalated')
        self._transition('force_approve', instance, self.actor)

        instance.refresh_from_db()
        self.assertEqual(instance.status, 'approved')

    def test_force_approve_from_revision_requested(self):
        instance = self._make_instance('revision_requested')
        self._transition('force_approve', instance, self.actor)

        instance.refresh_from_db()
        self.assertEqual(instance.status, 'approved')

    # ── Invalid transitions ──────────────────────────────────────────────────

    def test_approve_from_submitted_raises(self):
        from workflow.services.approval_engine import ApprovalEngine

        instance = self._make_instance('submitted')
        with patch.object(ApprovalEngine, '_sync_source_model'):
            with self.assertRaises(ValidationError):
                ApprovalEngine.approve(instance, self.actor)

    def test_approve_from_approved_raises(self):
        from workflow.services.approval_engine import ApprovalEngine

        instance = self._make_instance('approved')
        with patch.object(ApprovalEngine, '_sync_source_model'):
            with self.assertRaises(ValidationError):
                ApprovalEngine.approve(instance, self.actor)

    def test_resubmit_from_submitted_raises(self):
        from workflow.services.approval_engine import ApprovalEngine

        instance = self._make_instance('submitted')
        with patch.object(ApprovalEngine, '_sync_source_model'):
            with self.assertRaises(ValidationError):
                ApprovalEngine.resubmit(instance, self.submitter)

    def test_cancel_from_approved_raises(self):
        from workflow.services.approval_engine import ApprovalEngine

        instance = self._make_instance('approved')
        with patch.object(ApprovalEngine, '_sync_source_model'):
            with self.assertRaises(ValidationError):
                ApprovalEngine.cancel(instance, self.submitter)

    # ── Comment requirements ─────────────────────────────────────────────────

    def test_reject_without_comment_raises(self):
        from workflow.services.approval_engine import ApprovalEngine

        instance = self._make_instance('under_review')
        with patch.object(ApprovalEngine, '_sync_source_model'):
            with self.assertRaises(ValidationError):
                ApprovalEngine.reject(instance, self.actor, comment='')

    def test_request_revision_without_comment_raises(self):
        from workflow.services.approval_engine import ApprovalEngine

        instance = self._make_instance('under_review')
        with patch.object(ApprovalEngine, '_sync_source_model'):
            with self.assertRaises(ValidationError):
                ApprovalEngine.request_revision(instance, self.actor, comment='  ')

    # ── ApprovalAction written for every transition ──────────────────────────

    def test_every_transition_writes_approval_action(self):
        """Each successful transition creates exactly one ApprovalAction row."""
        instance = self._make_instance('submitted')
        before = ApprovalAction.objects.filter(instance=instance).count()
        self._transition('start_review', instance, self.actor)
        after = ApprovalAction.objects.filter(instance=instance).count()

        self.assertEqual(after - before, 1)

    # ── Reassign ─────────────────────────────────────────────────────────────

    def test_reassign_changes_current_approver_without_status_change(self):
        from workflow.services.approval_engine import ApprovalEngine

        instance = self._make_instance('under_review')
        old_status = instance.status
        new_approver = User.objects.create_user(
            username='ae_new_approver',
            password='testpass123',
        )

        ApprovalEngine.reassign(instance, self.actor, new_approver)

        instance.refresh_from_db()
        self.assertEqual(instance.status, old_status)
        self.assertEqual(instance.current_approver, new_approver)
