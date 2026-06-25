# Load the Celery app when Django starts so shared_task uses the right app.
from .celery import app as celery_app

__all__ = ('celery_app',)
