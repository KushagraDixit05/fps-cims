from django.utils import timezone
from .approval_engine import ApprovalEngine


class EscalationService:

    @classmethod
    def escalate(cls, instance):
        ApprovalEngine.escalate(instance)
