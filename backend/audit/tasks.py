from celery import shared_task


@shared_task
def write_audit_log_async(payload: dict):
    from audit.engine import _write_log
    _write_log(payload)
