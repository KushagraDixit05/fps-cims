from django.db.models.signals import post_save
from django.dispatch import receiver


@receiver(post_save, sender='mandi.MandiArrival')
def create_approval_on_submit(sender, instance, created, **kwargs):
    if instance.approval_status != 'submitted':
        return

    from workflow.models import ApprovalWorkflow, ApprovalInstance
    from workflow.services import ApprovalEngine
    from django.contrib.contenttypes.models import ContentType

    workflow = ApprovalWorkflow.objects.filter(
        module='mandi',
        model_name='MandiArrival',
        is_active=True,
    ).first()
    if not workflow:
        return

    ct = ContentType.objects.get_for_model(instance)
    if ApprovalInstance.objects.filter(
        content_type=ct,
        object_id=str(instance.pk),
        status__in=['submitted', 'under_review', 'resubmitted'],
    ).exists():
        return

    actor = instance.submitted_by
    if actor:
        ApprovalEngine.create_instance(workflow, instance, actor)
