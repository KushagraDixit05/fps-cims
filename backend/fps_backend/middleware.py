import uuid


class AuditContextMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        request_id = uuid.uuid4()
        device = request.META.get('HTTP_X_DEVICE_ID', '')
        ip = self._get_client_ip(request)

        try:
            from audit.engine import AuditEngine
            AuditEngine.set_request_context(request_id, device, ip)
        except Exception:
            pass

        response = self.get_response(request)
        response['X-Request-ID'] = str(request_id)
        return response

    @staticmethod
    def _get_client_ip(request):
        xff = request.META.get('HTTP_X_FORWARDED_FOR')
        if xff:
            return xff.split(',')[0].strip()
        return request.META.get('REMOTE_ADDR', '')
