class RegionScopedQuerysetMixin:
    """
    Filters queryset based on user's region scope from JWT claims.
    Subclasses set `region_field`, `own_read_perm`, `region_read_perm`, `all_read_perm`.
    """
    region_field = 'village__district'
    own_read_perm = None
    region_read_perm = None
    all_read_perm = None

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user

        if not self.request.auth or not hasattr(self.request.auth, 'payload'):
            return qs.filter(created_by=user)

        perms = self.request.auth.payload.get('perms', [])

        if self.all_read_perm and self.all_read_perm in perms:
            return qs

        if self.region_read_perm and self.region_read_perm in perms:
            districts = self.request.auth.payload.get('districts', [])
            if districts and self.region_field:
                return qs.filter(**{f'{self.region_field}__in': districts})

        return qs.filter(created_by=user)
