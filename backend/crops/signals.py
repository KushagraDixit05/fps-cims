from django.db.models.signals import post_save
from django.dispatch import receiver


@receiver(post_save, sender='crops.FarmerVisit')
def create_approval_on_submit(sender, instance, created, **kwargs):
    if instance.approval_status != 'submitted':
        return
    if not created:
        # Only trigger if just transitioned (check previous value via update_fields or always run)
        pass

    from workflow.models import ApprovalWorkflow
    from workflow.services import ApprovalEngine

    workflow = ApprovalWorkflow.objects.filter(
        module='crop_monitoring',
        model_name='FarmerVisit',
        is_active=True,
    ).first()
    if not workflow:
        return

    # Avoid duplicate instances
    from django.contrib.contenttypes.models import ContentType
    from workflow.models import ApprovalInstance
    ct = ContentType.objects.get_for_model(instance)
    if ApprovalInstance.objects.filter(
        content_type=ct,
        object_id=str(instance.pk),
        status__in=['submitted', 'under_review', 'resubmitted'],
    ).exists():
        return

    actor = instance.executive
    if actor:
        ApprovalEngine.create_instance(workflow, instance, actor)
