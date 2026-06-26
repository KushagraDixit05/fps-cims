"""
Auto-create an ApprovalInstance (in 'submitted' state) whenever a new
FarmerVisit, MandiArrival, or ProductDemo record is synced to the server.

Registered in WorkflowConfig.ready() so the signals are only wired after
the app registry is fully populated.
"""

from django.db.models.signals import post_save
from django.dispatch import receiver


def _get_actor(instance):
    """Return the submitting user from whichever field the model uses."""
    return getattr(instance, 'submitted_by', None) or getattr(instance, 'executive', None)


def _snapshot(instance):
    """Build a JSON-safe dict of the instance's scalar fields for data_snapshot."""
    skip = {'image', 'photo', 'before_photo', 'after_photo'}
    result = {}
    for field in instance._meta.get_fields():
        if field.is_relation:
            continue
        name = field.name
        if any(s in name for s in skip):
            continue
        val = getattr(instance, name, None)
        if val is None:
            result[name] = None
        elif hasattr(val, 'isoformat'):
            result[name] = val.isoformat()
        else:
            try:
                import json
                json.dumps(val)
                result[name] = val
            except (TypeError, ValueError):
                result[name] = str(val)
    return result


def _on_submission_created(sender, instance, created, **kwargs):
    if not created:
        return

    from django.contrib.contenttypes.models import ContentType
    from workflow.models import ApprovalInstance, ApprovalWorkflow
    from workflow.services.approval_engine import ApprovalEngine

    workflow = ApprovalWorkflow.objects.filter(
        model_name=sender.__name__, is_active=True
    ).first()
    if not workflow:
        return

    actor = _get_actor(instance)
    if actor is None:
        return

    ct = ContentType.objects.get_for_model(instance)

    # Guard against duplicate signals (idempotency for retried syncs)
    if ApprovalInstance.objects.filter(content_type=ct, object_id=instance.pk).exists():
        return

    ai = ApprovalInstance.objects.create(
        workflow=workflow,
        content_type=ct,
        object_id=instance.pk,
        submitted_by=actor,
        status='submitted',
        data_snapshot=_snapshot(instance),
    )
    ApprovalEngine._write_action(ai, actor, 'submitted', '')
    ApprovalEngine._write_audit(ai, actor, 'submitted', '')


def register_signals():
    from django.apps import apps

    FarmerVisit = apps.get_model('crops', 'FarmerVisit')
    MandiArrival = apps.get_model('mandi', 'MandiArrival')
    ProductDemo = apps.get_model('product_demo', 'ProductDemo')

    for model in (FarmerVisit, MandiArrival, ProductDemo):
        post_save.connect(_on_submission_created, sender=model, weak=False)
