"""
audit/tests/test_audit_engine.py
==================================
Unit tests for AuditEngine.

Tests cover:
- AUDIT_ENGINE_ENABLED=False suppresses all writes
- Synchronous fallback writes a row to AuditLog (Celery absent in tests)
- Exceptions from the audit engine are swallowed (never propagate to caller)
- Event fields are recorded correctly in the AuditLog row
"""
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings

from audit.models import AuditLog

User = get_user_model()


@override_settings(AUDIT_ENGINE_ENABLED=False)
class AuditEngineDisabledTest(TestCase):

    def test_disabled_flag_suppresses_all_writes(self):
        from audit.engine import AuditEngine

        AuditEngine.log(None, event_type='user', action='login', module='accounts')

        self.assertEqual(AuditLog.objects.count(), 0)


class AuditEngineSyncWriteTest(TestCase):
    """
    Tests that exercise the synchronous fallback path.

    In the test environment there is no Celery broker, so apply_async raises
    an exception and _write_sync is called automatically.
    """

    def setUp(self):
        self.user = User.objects.create_user(
            username='audit_test_user',
            password='testpass123',
        )

    @override_settings(AUDIT_ENGINE_ENABLED=True)
    def test_sync_fallback_writes_row(self):
        from audit.engine import AuditEngine

        # Force apply_async to fail so we hit the sync fallback.
        with patch('audit.tasks.write_audit_log.apply_async', side_effect=Exception('no broker')):
            AuditEngine.log(
                None,
                event_type='user',
                action='test_action',
                module='test_module',
                actor_override=self.user,
            )

        row = AuditLog.objects.filter(action='test_action').first()
        self.assertIsNotNone(row)
        self.assertEqual(row.actor_username, self.user.username)
        self.assertEqual(row.event_type, 'user')
        self.assertEqual(row.module, 'test_module')

    @override_settings(AUDIT_ENGINE_ENABLED=True)
    def test_event_fields_recorded_correctly(self):
        from audit.engine import AuditEngine

        with patch('audit.tasks.write_audit_log.apply_async', side_effect=Exception('no broker')):
            AuditEngine.log(
                None,
                event_type='permission',
                action='override_created',
                module='accounts',
                actor_override=self.user,
                changes={'codename': ['', 'can_view_farms']},
            )

        row = AuditLog.objects.filter(action='override_created').first()
        self.assertIsNotNone(row)
        self.assertEqual(row.event_type, 'permission')
        self.assertEqual(row.changes.get('codename'), ['', 'can_view_farms'])

    @override_settings(AUDIT_ENGINE_ENABLED=True)
    def test_exception_in_audit_is_swallowed(self):
        """
        An error inside _write_sync must never propagate to the caller.
        This ensures audit failures can never break business logic.
        """
        from audit.engine import AuditEngine

        with patch('audit.tasks.write_audit_log.apply_async', side_effect=Exception('no broker')):
            with patch.object(AuditEngine, '_write_sync', side_effect=RuntimeError('db down')):
                # Must not raise
                try:
                    AuditEngine.log(
                        None,
                        event_type='user',
                        action='silent_fail',
                        module='test',
                        actor_override=self.user,
                    )
                except Exception as exc:
                    self.fail(f'AuditEngine.log raised unexpectedly: {exc}')

    @override_settings(AUDIT_ENGINE_ENABLED=True)
    def test_anonymous_login_failure_records_attempted_username(self):
        """Failed login audit entries store the attempted username in actor_username."""
        from audit.engine import AuditEngine

        with patch('audit.tasks.write_audit_log.apply_async', side_effect=Exception('no broker')):
            AuditEngine.log(
                None,
                event_type='user',
                action='login_failed',
                module='accounts',
                changes={'username': 'hacker_attempt'},
            )

        row = AuditLog.objects.filter(action='login_failed').first()
        self.assertIsNotNone(row)
        self.assertEqual(row.actor_username, 'hacker_attempt')
