# Phase 3 — Crop-Wise Market Intelligence

> **Goal:** Restructure the Market Intelligence module to capture arrivals per crop instead of a single total, link Step 1 crops to Step 2 details, and display crop-wise review summaries.

**Depends on:** Phase 1 (Market Trend and Market Insight fields must exist)

---

## Requirements Covered

| Req ID | Requirement | Module |
|--------|-------------|--------|
| M-2 | Crop-Wise Arrival Entry | Market Intelligence |
| M-3 | Filter Crops — Step 1 → Step 2 linkage | Market Intelligence |
| M-7 | Crop-Wise Review Summary | Market Intelligence |
| G-5 | CSV Export for Multiple Varieties (Mandi portion) | Market Intelligence |

---

## Estimated Effort

- **Total:** 8–10 days
- **Risk:** High — fundamentally changes the Market Intelligence data model from a single-commodity-per-row to a parent-child structure

---

## Current State Analysis

### Data Model
- `MandiArrival` stores **one commodity per row** (field: `commodity`).
- The unique constraint is `(mandi, date, commodity)` — one entry per mandi per day per commodity.
- The mobile wizard captures a single commodity in Step 1 with total arrival quantity.

### Mobile Wizard Flow
1. Step 1: Market Details (mandi, date, commodity, total arrival, prices)
2. Step 2: Crop Varieties (variety details for the single commodity)
3. Step 3: Source & Remark
4. Step 4: Photos + Location (after Phase 0 merge)
5. Review

### Problem
- Users must submit **separate entries** for each crop at a mandi (e.g., Chilli, Soybean, Cotton).
- No way to capture multi-crop arrivals in a single visit.
- Step 2 shows all crops, not just the one selected in Step 1.

---

## Architecture Decision

### Option A: Keep flat model, submit multiple `MandiArrival` rows
- Each crop becomes its own `MandiArrival` record.
- Pro: No data model changes.
- Con: Prices, source, remark, photos, location are duplicated across rows.

### Option B: Parent-child model (Market Visit → Crop Arrivals) ← **Recommended**
- New parent model: `MarketVisit` (mandi, date, photos, location, source, remark, insight).
- New child model: `CropArrival` (crop, arrival_qty, prices, trend) — multiple per visit.
- Mirrors the `FarmerVisit → CropRecord` pattern already used in CMM.

**Decision:** Option B — parent-child model. Matches the existing architectural pattern and enables clean crop-wise review and export.

---

## 1. Backend Changes

### 1.1 New Models — `mandi/models.py`

```python
class MarketVisit(models.Model):
    """A single market intelligence visit — one field executive, one mandi, one date."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    mandi = models.ForeignKey(Mandi, on_delete=models.CASCADE, related_name='market_visits')
    submitted_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    date = models.DateField()
    
    # Source & insights (moved from MandiArrival)
    source = models.CharField(max_length=20, choices=SOURCE_CHOICES, default='trader')
    custom_source = models.CharField(max_length=100, blank=True, default='')
    remark = models.TextField(blank=True)
    market_insight = models.TextField(blank=True)
    
    # GPS (optional)
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)
    location = models.PointField(null=True, blank=True)
    
    # Sync / audit
    local_id = models.CharField(max_length=100, blank=True)
    approval_status = models.CharField(max_length=30, default='draft')
    approved_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    # Photos stored via MarketVisitPhoto (below)
    
    class Meta:
        ordering = ['-date']
        constraints = [
            models.UniqueConstraint(
                fields=['submitted_by', 'local_id'],
                condition=~models.Q(local_id=''),
                name='uniq_marketvisit_submittedby_local_id',
            ),
        ]


class CropArrival(models.Model):
    """One crop's arrival data within a MarketVisit."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    visit = models.ForeignKey(MarketVisit, on_delete=models.CASCADE, related_name='crop_arrivals')
    
    crop_name = models.CharField(max_length=100)
    arrival_quantity = models.DecimalField(max_digits=10, decimal_places=2, help_text="Quintal")
    
    avg_rate = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    min_rate = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    max_rate = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    
    market_trend = models.CharField(max_length=10, choices=MARKET_TREND_CHOICES, default='steady')
    
    # Varieties for this crop (JSON list of strings)
    varieties = models.JSONField(default=list, blank=True)
    
    sort_order = models.PositiveSmallIntegerField(default=0)
    
    class Meta:
        ordering = ['sort_order']


class MarketVisitPhoto(models.Model):
    """Photos attached to a MarketVisit."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    visit = models.ForeignKey(MarketVisit, on_delete=models.CASCADE, related_name='photos')
    image = models.ImageField(upload_to='market_photos/%Y/%m/')
    uploaded_at = models.DateTimeField(auto_now_add=True)
```

### 1.2 Backward Compatibility

- **Do NOT delete** the existing `MandiArrival` model.
- Mark it as legacy (add a docstring).
- New submissions go through `MarketVisit` + `CropArrival`.
- Existing `MandiArrival` records remain queryable for historical data.
- Admin portal shows both old and new data (unified view).

### 1.3 New API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/market-visits/` | Submit market visit (multipart: JSON crops + photos) |
| GET | `/api/market-visits/` | Paginated list |
| GET | `/api/market-visits/<uuid>/` | Detail with nested crop arrivals |
| GET | `/api/market-visits/summary/` | Dashboard counts |

**Submission payload:**
```json
{
  "mandi_id": 1,
  "date": "2026-06-20",
  "source": "self",
  "remark": "...",
  "market_insight": "...",
  "latitude": 19.15,
  "longitude": 77.32,
  "crops": [
    {
      "crop_name": "Chilli",
      "arrival_quantity": 120,
      "avg_rate": 8500,
      "min_rate": 7000,
      "max_rate": 10000,
      "market_trend": "up",
      "varieties": ["Teja", "Syngenta 204"]
    },
    {
      "crop_name": "Soybean",
      "arrival_quantity": 300,
      "avg_rate": 4200,
      "market_trend": "steady",
      "varieties": ["JS 335"]
    }
  ]
}
```

### 1.4 CSV Export

One row per crop-variety combination:

```csv
Date, Executive, Mandi, District, Crop, Variety, Arrival(Qt), Avg Rate, Min Rate, Max Rate, Trend, Source, Remark, Market Insight
2026-06-20, Kushagra, Guntur, Guntur, Chilli, Teja, 120, 8500, 7000, 10000, UP, Self, ..., ...
2026-06-20, Kushagra, Guntur, Guntur, Chilli, Syngenta 204, 120, 8500, 7000, 10000, UP, Self, ..., ...
2026-06-20, Kushagra, Guntur, Guntur, Soybean, JS 335, 300, 4200, , , STEADY, Self, ..., ...
```

### 1.5 Admin Portal Views

Update `admin_portal/views.py`:
- New `MarketVisitListView` and `MarketVisitExportView`.
- Unified view: query both `MarketVisit` and legacy `MandiArrival`, merge results.

---

## 2. Mobile Changes

### 2.1 WatermelonDB — New Tables

**Schema bump** (v10 or v11, depending on Phase 1/2 ordering):

```typescript
// New table: market_visits
tableSchema({
  name: 'market_visits',
  columns: [
    { name: 'server_id', type: 'string', isOptional: true },
    { name: 'mandi_id', type: 'string' },
    { name: 'mandi_name', type: 'string' },
    { name: 'date', type: 'string' },
    { name: 'source', type: 'string' },
    { name: 'custom_source', type: 'string' },
    { name: 'remark', type: 'string' },
    { name: 'market_insight', type: 'string' },
    { name: 'latitude', type: 'number', isOptional: true },
    { name: 'longitude', type: 'number', isOptional: true },
    { name: 'photos_json', type: 'string' },
    { name: 'crops_json', type: 'string' },   // JSON array of CropArrival objects
    { name: 'is_synced', type: 'boolean' },
    { name: 'sync_error', type: 'string' },
    { name: 'created_at_local', type: 'number' },
  ],
}),
```

### 2.2 Wizard Restructure

**New Step Flow (4 steps):**

| Step | Content | Changes |
|------|---------|---------|
| **Step 1: Market Details** | Mandi selection, date, **repeatable crop rows** | Major — add repeatable crop entry UI |
| **Step 2: Crop Details** | Per-crop prices, trend, varieties | Major — dynamically generated sections from Step 1 crops |
| **Step 3: Source & Insights** | Source, remark, market insight | Minor — same as before |
| **Step 4: Photos + Location** | Photos, optional GPS | No change (already merged in Phase 0) |

### 2.3 Step 1 — Repeatable Crop Rows

```
┌───────────────────────────────────┐
│  Market Details                   │
│                                   │
│  Mandi:  [Guntur Mandi      ▼]  │
│  Date:   [20 Jun 2026       📅]  │
│                                   │
│  ── Crops ─────────────────────── │
│  ┌─────────────────────────────┐  │
│  │ Crop: [Chilli           ▼] │  │
│  │ Arrival: [120        ] Qt  │  │
│  │                        [×] │  │
│  └─────────────────────────────┘  │
│  ┌─────────────────────────────┐  │
│  │ Crop: [Soybean          ▼] │  │
│  │ Arrival: [300        ] Qt  │  │
│  │                        [×] │  │
│  └─────────────────────────────┘  │
│                                   │
│  [＋ Add Crop]                    │
│                                   │
│  [Next →]                         │
└───────────────────────────────────┘
```

- Crop dropdown populated from `CropMaster` (already seeded locally).
- At least one crop is required.
- Each crop row has: Crop Dropdown + Arrival Quantity + Remove button.

### 2.4 Step 2 — Filtered Crop Details

**Only crops selected in Step 1 appear in Step 2.** Each crop gets its own collapsible section:

```
┌───────────────────────────────────┐
│  Crop Details                     │
│                                   │
│  ▼ Chilli (120 Qt)                │
│  ┌─────────────────────────────┐  │
│  │ Avg Rate: [8500] ₹/Qt      │  │
│  │ Min Rate: [7000] ₹/Qt      │  │
│  │ Max Rate: [10000] ₹/Qt     │  │
│  │ Trend:  [UP] [DOWN] [STEADY]│  │
│  │ Varieties: [Teja, S-204]   │  │
│  └─────────────────────────────┘  │
│                                   │
│  ▼ Soybean (300 Qt)               │
│  ┌─────────────────────────────┐  │
│  │ Avg Rate: [4200] ₹/Qt      │  │
│  │ Trend:  [UP] [DOWN] [STEADY]│  │
│  │ Varieties: [JS 335]        │  │
│  └─────────────────────────────┘  │
│                                   │
│  [Next →]                         │
└───────────────────────────────────┘
```

### 2.5 Review Screen — Crop-Wise Summary (M-7)

```
┌───────────────────────────────────┐
│  Review                           │
│                                   │
│  📍 Guntur Mandi · 20 Jun 2026   │
│                                   │
│  ── Chilli ────────────────────── │
│  Arrival:  120 Qt                 │
│  Avg Rate: ₹8,500/Qt             │
│  Range:    ₹7,000 – ₹10,000      │
│  Trend:    ↑ UP                   │
│  Varieties: Teja, Syngenta 204   │
│                                   │
│  ── Soybean ───────────────────── │
│  Arrival:  300 Qt                 │
│  Avg Rate: ₹4,200/Qt             │
│  Trend:    → STEADY               │
│  Varieties: JS 335               │
│                                   │
│  Source: Self                     │
│  Market Insight: "Traders expect  │
│  arrivals to increase..."         │
│                                   │
│  📸 2 Photos  📍 Location captured│
│                                   │
│  [Submit] [Share]                 │
└───────────────────────────────────┘
```

### 2.6 Sync Service Update

- New `saveMarketVisitLocally()` function in `database/operations.ts`.
- New `syncMarketVisits()` in `syncService.ts`:
  - Reads pending `market_visits` records.
  - Sends to `POST /api/market-visits/` as multipart (photos) + JSON (crops).
  - Marks as synced on success.

---

## 3. Admin Portal Changes

### 3.1 Market Intelligence Table

- Update the Mandi Arrivals table to show data from both `MarketVisit` (new) and `MandiArrival` (legacy).
- New columns: Crop Count, Crops List.
- Click → detail view with crop-wise breakdown.

### 3.2 CSV Export

- Use the one-row-per-crop-per-variety format described in §1.4.
- Include both legacy `MandiArrival` rows and new `MarketVisit` → `CropArrival` rows.

---

## Data Migration

### Legacy `MandiArrival` → `MarketVisit`

Optional migration command:
```bash
python manage.py migrate_mandi_to_market_visits
```

For each existing `MandiArrival`:
1. Create a `MarketVisit` with the same mandi, date, source, remark, GPS.
2. Create one `CropArrival` child with the commodity, arrival_qty, prices.
3. Mark the original `MandiArrival` with a `migrated=True` flag.

**Decision needed:** Run this migration or keep both data sources?

---

## Open Questions

> [!IMPORTANT]
> Resolve before implementation.

1. **Should Step 2 be mandatory for all crops?** Or can a user enter arrival quantity only (Step 1) and skip prices/trend?
2. **Duplicate crop validation:** Should the form prevent adding the same crop twice in Step 1?
3. **Legacy data:** Should we migrate old `MandiArrival` records to the new structure, or keep them as-is and query both?
4. **Total arrival:** Should we display a computed total across all crops, or remove the concept of "total arrival"?

---

## Verification Plan

### Automated
- New backend tests for `MarketVisit` + `CropArrival` creation.
- Test CSV export with multi-crop, multi-variety data.
- Test unique constraint on `(submitted_by, local_id)`.

### Manual
- Submit a market visit with 3 crops, each with different prices and trends.
- Verify Step 2 shows only the crops selected in Step 1.
- Verify Review screen shows crop-wise summary.
- Verify CSV export generates one row per crop per variety.
- Test offline: save multi-crop market visit locally, sync when online.
