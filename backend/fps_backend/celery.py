"""
Celery application for fps_backend.

Bootstraps the async task layer that RBAC depends on (approval escalation,
async audit writes — added in later phases). Broker/result backend are Redis,
configured via the CELERY_* settings in settings.py.
"""
import os

from celery import Celery

# Ensure Django settings are available when Celery starts as its own process.
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'fps_backend.settings')

app = Celery('fps_backend')

# All Celery config lives in Django settings under the CELERY_ namespace.
app.config_from_object('django.conf:settings', namespace='CELERY')

# Discover tasks.py modules in every installed app.
app.autodiscover_tasks()
