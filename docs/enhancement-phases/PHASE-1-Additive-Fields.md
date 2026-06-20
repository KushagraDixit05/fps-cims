# Phase 1 — Additive Fields

> **Goal:** Add new data fields and minor model changes to Market Intelligence and Product Performance modules.
> These are additive-only changes — new columns, new choices, new UI fields. No structural refactoring.

**Depends on:** Phase 0 (module naming must be standardized first)

---

## Requirements Covered

| Req ID | Requirement | Module |
|--------|-------------|--------|
| M-1 | Market Trend field (UP / DOWN / STEADY) | Market Intelligence |
| M-4 | Add "Self" Source option | Market Intelligence |
| M-5 | Market Insight field | Market Intelligence |
| P-1 | Photos + Location — Before/After GPS split | Product Performance |
| G-5 | CSV Export for Multiple Varieties (Product Demo — already done; Mandi → Phase 3) | Product Performance |

---

## Estimated Effort

- **Total:** 5–7 days
- **Risk:** Medium — requires Django migrations + WatermelonDB schema bump + mobile/admin updates

---

## 1. Market Trend Field (M-1)

### Backend — `mandi/models.py`

```python
MARKET_TREND_CHOICES = [
    ('up', 'Up'),
    ('down', 'Down'),
    ('steady', 'Steady'),
]

# Add to MandiArrival model:
market_trend = models.CharField(
    max_length=10,
    choices=MARKET_TREND_CHOICES,
    default='steady',
)
```

### Backend — Serializer
- Add `market_trend` to `MandiArrivalSerializer` (read + write).
- Mark as **required** in the serializer validation.

### Backend — CSV Export
- Add `Market Trend` column to `MandiArrivalExportView` in `admin_portal/views.py`.

### Mobile — WatermelonDB
- **Schema bump** (v8 → v9): Add `market_trend` column to `mandi_arrivals` table.
- **Migration:** Additive — `{ type: 'add_columns', table: 'mandi_arrivals', columns: [{ name: 'market_trend', type: 'string' }] }`
- **Model:** Add `@field('market_trend') marketTrend!: string;` to `MandiArrivalModel`.

### Mobile — Form
- **File:** `src/screens/mandiArrival/Step1_MandiDetails.tsx`
- Add a **Market Trend** selector with three options: UP (↑), DOWN (↓), STEADY (→).
- UI: Three horizontally arranged pill buttons (similar to `ConditionSelector`).
- **Mandatory** — cannot proceed to Step 2 without selecting a trend.

### Mobile — Review Screen
- Display the selected market trend with an appropriate icon/color.

### Mobile — Sync
- Include `market_trend` in the sync payload sent to the API.

### Admin Portal
- Display market trend in Mandi Arrivals table with an icon (▲ / ▼ / ─).
- Add trend filter to the admin data table.

### Acceptance Criteria
- [ ] Market Trend is mandatory in the mobile form (Step 1).
- [ ] Trend is stored locally (WatermelonDB) and synced to the backend.
- [ ] Trend appears in the Review screen, admin portal table, and CSV export.
- [ ] Three options: UP, DOWN, STEADY with visual indicators.

---

## 2. Add "Self" Source (M-4)

### Backend — `mandi/models.py`

```python
SOURCE_CHOICES = [
    ('trader', 'Trader'),
    ('farmer', 'Farmer'),
    ('fps_staff', 'FPS Staff'),
    ('mandi', 'Mandi'),
    ('official', 'Mandi Official'),
    ('self', 'Self'),               # ← NEW
    ('other', 'Other'),
]
```

### Mobile — Form
- **File:** `src/screens/mandiArrival/Step3_SourceRemark.tsx`
- Add "Self" to the source picker options.
- Place it after "FPS Staff" and before "Other" in the UI list.

### Mobile — WatermelonDB
- No schema change needed — `source` is already a string column.

### Admin Portal
- Update source filter dropdown to include "Self".

### Acceptance Criteria
- [ ] "Self" appears as a selectable source in the Market Intelligence wizard.
- [ ] Source value "self" is stored and synced correctly.
- [ ] Admin portal displays and filters by "Self" source.

---

## 3. Market Insight Field (M-5)

### Backend — `mandi/models.py`

```python
# Add to MandiArrival model:
market_insight = models.TextField(blank=True, default='')
```

### Backend — Serializer
- Add `market_insight` to read/write serializer.
- **Optional** field — no validation required.

### Backend — CSV Export
- Add `Market Insight` column after `Remark` in the CSV export.

### Mobile — WatermelonDB
- **Schema bump** (part of v9 migration): Add `market_insight` column to `mandi_arrivals` table.
- **Migration:** `{ name: 'market_insight', type: 'string' }`
- **Model:** Add `@field('market_insight') marketInsight!: string;`

### Mobile — Form
- **File:** `src/screens/mandiArrival/Step3_SourceRemark.tsx`
- Add a **Market Insight** multi-line text input above or below the existing Remark field.
- Placeholder: _"Share qualitative market observations (e.g., 'Traders expect arrivals to increase next week due to early harvesting')"_
- Optional — can be left empty.

### Mobile — Review Screen
- Display Market Insight in its own section (separate from Remark).

### Mobile — Sync
- Include `market_insight` in the sync payload.

### Acceptance Criteria
- [ ] Market Insight field appears in Step 3 of Market Intelligence wizard.
- [ ] Multi-line text input, optional.
- [ ] Displayed in Review screen, admin portal, and CSV export.
- [ ] Separate from the existing Remark field.

---

## 4. Product Performance — Before/After Location Split (P-1)

### Current State
- `ProductDemo` model has single `latitude`, `longitude`, `location` fields.
- Photos already support before/after split via `DemoPhoto.photo_type`.
- **Missing:** Separate GPS for "before" and "after" visits.

### Backend — `product_demo/models.py`

```python
# Add to ProductDemo model:
before_latitude  = models.FloatField(null=True, blank=True)
before_longitude = models.FloatField(null=True, blank=True)
before_location  = models.PointField(null=True, blank=True)

after_latitude   = models.FloatField(null=True, blank=True)
after_longitude  = models.FloatField(null=True, blank=True)
after_location   = models.PointField(null=True, blank=True)
```

**Backward compatibility:** Keep existing `latitude`, `longitude`, `location` fields unchanged. New fields are additive. The original fields continue to store the "primary" location (set during the initial before-phase submission).

### Backend — Serializer
- Add before/after location fields to the `ProductDemoSerializer`.
- Auto-populate `before_location` PointField from `before_latitude`/`before_longitude` (same pattern as existing location fields).
- Same for `after_location`.

### Backend — CSV Export
- Add columns: `Before Latitude`, `Before Longitude`, `After Latitude`, `After Longitude`.

### Mobile — WatermelonDB
- **Schema bump** (part of v9 migration): Add 4 columns to `product_demos`:
  - `before_latitude`, `before_longitude`, `after_latitude`, `after_longitude`
- All nullable (type: `number`, isOptional: true).

### Mobile — Form
- **File:** `src/screens/productDemo/Step4_PhotosResultRemark.tsx`
- When capturing "Before" photos, also capture GPS → store as `before_latitude`/`before_longitude`.
- When completing the "After" phase, capture GPS → store as `after_latitude`/`after_longitude`.
- Use existing `LocationCapture` component.

### Mobile — Review Screen
- Display before and after locations separately if both are available.

### Mobile — Sync
- Include before/after GPS in the sync payload.

### Acceptance Criteria
- [ ] Before and After GPS are captured separately.
- [ ] Both sets of coordinates are stored locally and synced.
- [ ] CSV export includes separate Before/After location columns.
- [ ] Backward compatible — existing records with single location remain valid.

---

## 5. CSV Export — Multiple Varieties (G-5)

### Current State (Already Done)
- `ProductDemoExportView` already generates one row per variety (see `admin_portal/views.py` lines 386–404).
- The `varieties` JSONField on `ProductDemo` is iterated and each variety gets its own CSV row.

### Remaining Work (Phase 3)
- Mandi Arrival CSV does not yet support multiple crops per entry — this is part of Phase 3 (Crop-Wise Market Intelligence) where the data model changes to support per-crop arrivals.

### This Phase
- **Verify** existing Product Demo CSV export produces correct one-row-per-variety output.
- **Add test case** with a demo that has 3+ varieties to confirm correct export behavior.

### Acceptance Criteria
- [ ] Product Demo CSV export confirmed: one row per variety.
- [ ] No regressions in existing export functionality.

---

## WatermelonDB Schema Migration Summary (v8 → v9)

All changes in this phase are additive and bundled into a single schema version bump:

```typescript
// migration v8 → v9
{
  toVersion: 9,
  steps: [
    // Market Intelligence
    {
      type: 'add_columns',
      table: 'mandi_arrivals',
      columns: [
        { name: 'market_trend', type: 'string' },
        { name: 'market_insight', type: 'string' },
      ],
    },
    // Product Performance
    {
      type: 'add_columns',
      table: 'product_demos',
      columns: [
        { name: 'before_latitude', type: 'number', isOptional: true },
        { name: 'before_longitude', type: 'number', isOptional: true },
        { name: 'after_latitude', type: 'number', isOptional: true },
        { name: 'after_longitude', type: 'number', isOptional: true },
      ],
    },
  ],
}
```

---

## Django Migration Summary

Two new migrations in this phase:
1. `mandi/migrations/XXXX_add_market_trend_insight.py` — adds `market_trend` and `market_insight` to `MandiArrival`.
2. `product_demo/migrations/XXXX_add_before_after_location.py` — adds 6 new fields (`before_latitude`, `before_longitude`, `before_location`, `after_latitude`, `after_longitude`, `after_location`) to `ProductDemo`.

---

## Verification Plan

### Automated
- `python manage.py test` — all existing tests pass.
- `python manage.py makemigrations --check` — no unmigrated changes.

### Manual
- Submit a Market Intelligence entry with trend=UP and a market insight.
- Submit a Product Demo with Before and After GPS captured separately.
- Export CSVs and verify new columns.
- Verify admin portal tables display new fields.
- Test WatermelonDB migration from v8 → v9 (fresh install + upgrade).
