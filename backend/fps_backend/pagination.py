from rest_framework.pagination import PageNumberPagination


class MobilePagination(PageNumberPagination):
    """
    Default pagination for mobile-facing list endpoints.

    Applied per-viewset (not globally) so that master/dropdown endpoints and
    array-consuming clients keep returning plain lists. Responses use the
    standard DRF envelope: {count, next, previous, results}.
    """
    page_size = 50
    page_size_query_param = 'page_size'
    max_page_size = 200
