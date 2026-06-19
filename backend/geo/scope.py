class DataScope:
    """RBAC boundary — scopes querysets to what the requesting user may see."""

    def __init__(self, user):
        self.user = user

    def apply_to_visits(self, qs):
        if self.user.role == 'field_executive':
            return qs.filter(executive=self.user)
        return qs

    def apply_to_demos(self, qs):
        if self.user.role == 'field_executive':
            return qs.filter(executive=self.user)
        return qs

    def apply_to_arrivals(self, qs):
        if self.user.role == 'field_executive':
            return qs.filter(submitted_by=self.user)
        return qs
