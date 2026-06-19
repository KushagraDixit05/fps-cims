from dataclasses import dataclass, field
from datetime import date
from typing import Optional


@dataclass
class GeoFilters:
    crops: list = field(default_factory=list)
    products: list = field(default_factory=list)
    commodities: list = field(default_factory=list)
    mandis: list = field(default_factory=list)
    modules: list = field(default_factory=lambda: ['visit', 'demo', 'mandi'])
    condition: Optional[str] = None
    district: Optional[str] = None
    block: Optional[str] = None
    date_from: Optional[date] = None
    date_to: Optional[date] = None
    executive_id: Optional[int] = None
    product_name: Optional[str] = None

    @classmethod
    def parse(cls, query_params):
        crops = [c for c in query_params.getlist('crops') if c]
        products = [p for p in query_params.getlist('products') if p]
        commodities = [c for c in query_params.getlist('commodities') if c]
        mandis = [m for m in query_params.getlist('mandis') if m]
        modules = [m for m in query_params.getlist('modules') if m]
        if not modules:
            modules = ['visit', 'demo', 'mandi']

        date_from = date_to = None
        try:
            if query_params.get('date_from'):
                date_from = date.fromisoformat(query_params['date_from'])
        except ValueError:
            pass
        try:
            if query_params.get('date_to'):
                date_to = date.fromisoformat(query_params['date_to'])
        except ValueError:
            pass

        executive_id = None
        try:
            if query_params.get('executive_id'):
                executive_id = int(query_params['executive_id'])
        except (ValueError, TypeError):
            pass

        return cls(
            crops=crops,
            products=products,
            commodities=commodities,
            mandis=mandis,
            modules=modules,
            condition=query_params.get('condition') or None,
            district=query_params.get('district') or None,
            block=query_params.get('block') or None,
            date_from=date_from,
            date_to=date_to,
            executive_id=executive_id,
            product_name=query_params.get('product_name') or None,
        )

    def apply_to_visits(self, qs):
        if self.crops:
            qs = qs.filter(crops__crop_name__in=self.crops)
        if self.condition:
            qs = qs.filter(crops__crop_condition=self.condition)
        if self.district:
            qs = qs.filter(district_name__iexact=self.district)
        if self.block:
            qs = qs.filter(block_name__iexact=self.block)
        if self.date_from:
            qs = qs.filter(submitted_at__date__gte=self.date_from)
        if self.date_to:
            qs = qs.filter(submitted_at__date__lte=self.date_to)
        if self.executive_id:
            qs = qs.filter(executive_id=self.executive_id)
        return qs.distinct()

    def apply_to_demos(self, qs):
        if self.crops:
            qs = qs.filter(crop_name__in=self.crops)
        if self.district:
            qs = qs.filter(district_name__iexact=self.district)
        if self.block:
            qs = qs.filter(block_name__iexact=self.block)
        if self.date_from:
            qs = qs.filter(submitted_at__date__gte=self.date_from)
        if self.date_to:
            qs = qs.filter(submitted_at__date__lte=self.date_to)
        if self.executive_id:
            qs = qs.filter(executive_id=self.executive_id)
        if self.products:
            qs = qs.filter(product_name__in=self.products)
        elif self.product_name:
            qs = qs.filter(product_name__iexact=self.product_name)
        return qs

    def apply_to_arrivals(self, qs):
        if self.commodities:
            qs = qs.filter(commodity__in=self.commodities)
        if self.mandis:
            qs = qs.filter(mandi__name__in=self.mandis)
        if self.district:
            qs = qs.filter(mandi__district__iexact=self.district)
        if self.date_from:
            qs = qs.filter(date__gte=self.date_from)
        if self.date_to:
            qs = qs.filter(date__lte=self.date_to)
        if self.executive_id:
            qs = qs.filter(submitted_by_id=self.executive_id)
        return qs
