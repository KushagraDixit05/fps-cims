# Phase 5 — Master Data Admin & Reports

> **Goal:** Give administrators direct control over master data (districts, blocks, crops, varieties) and expand the Reports module into a comprehensive analytics dashboard covering all three modules.

**Depends on:** Phase 1 (new fields), Phase 3 (crop-wise Market Intelligence data)

---

## Requirements Covered

| Req ID | Requirement | Module |
|--------|-------------|--------|
| C-3 | Admin Managed Master Data | Crop Intelligence / Admin Portal |
| R-1 | Detailed Reports Dashboard | Reports |
| R-2 | Market Intelligence Analytics | Reports |
| R-3 | Product Performance Analytics | Reports |

---

## Estimated Effort

- **Total:** 10–14 days
- **Risk:** Medium — mostly additive (new admin pages, new API endpoints, new dashboard charts). No changes to existing field-data models.

---

## Part A: Admin Managed Master Data (C-3)

### Current State
- Master data (Districts, Blocks, Crops, Varieties, Mandis, Products) is seeded via Django management commands:
  - `python manage.py seed_crop_master` — seeds 8 crops, 25 varieties, 46 blocks.
  - `python manage.py seed_product_master` — seeds 20 agrochemical products.
- Adding new entries requires developer intervention (editing seed scripts, re-running commands).
- Django Admin (`/admin/`) can manage these models, but it's not exposed to non-technical admins.

### Goal
- Admin Portal users (staff) can **add, edit, deactivate** master data records from the web dashboard.
- Changes sync to mobile apps on next reference data refresh.

---

### 1. Backend API Endpoints

#### Districts

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/master-data/districts/` | List all districts |
| POST | `/api/admin/master-data/districts/` | Create district |
| PATCH | `/api/admin/master-data/districts/<id>/` | Update district |
| DELETE | `/api/admin/master-data/districts/<id>/` | Soft delete (set `is_active=False`) |

#### Blocks

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/master-data/blocks/?district=<id>` | List blocks for a district |
| POST | `/api/admin/master-data/blocks/` | Create block |
| PATCH | `/api/admin/master-data/blocks/<id>/` | Update block |
| DELETE | `/api/admin/master-data/blocks/<id>/` | Soft delete |

#### Crops & Varieties

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/master-data/crops/` | List all crops with nested varieties |
| POST | `/api/admin/master-data/crops/` | Create crop |
| PATCH | `/api/admin/master-data/crops/<id>/` | Update crop |
| POST | `/api/admin/master-data/crops/<id>/varieties/` | Add variety to crop |
| PATCH | `/api/admin/master-data/varieties/<id>/` | Update variety |
| DELETE | `/api/admin/master-data/varieties/<id>/` | Soft delete variety |

#### Mandis

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/master-data/mandis/` | List all mandis |
| POST | `/api/admin/master-data/mandis/` | Create mandi |
| PATCH | `/api/admin/master-data/mandis/<id>/` | Update mandi |

#### Products

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/master-data/products/` | List all products |
| POST | `/api/admin/master-data/products/` | Create product |
| PATCH | `/api/admin/master-data/products/<id>/` | Update product |

All endpoints require `is_staff` permission.

---

### 2. Admin Portal — Master Data Pages

New section in sidebar: **Master Data** (under Administration).

#### Districts & Blocks Page

```
┌──────────────────────────────────────────────────┐
│  Master Data > Districts & Blocks                │
│                                                  │
│  [+ Add District]                    🔍 Search   │
│                                                  │
│  ┌────────────────────────────────────────────┐  │
│  │ District     │ State    │ Blocks │ Status  │  │
│  ├──────────────┼──────────┼────────┼─────────┤  │
│  │ Nanded       │ MH       │ 8      │ Active  │  │
│  │ Guntur       │ AP       │ 12     │ Active  │  │
│  │ Khammam      │ TS       │ 6      │ Active  │  │
│  └────────────────────────────────────────────┘  │
│                                                  │
│  Click row → expand to show blocks:              │
│  ┌────────────────────────────────────────────┐  │
│  │  Blocks in Nanded:                         │  │
│  │  Kinwat, Biloli, Mukhed, Hadgaon, ...      │  │
│  │  [+ Add Block]                             │  │
│  └────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────┘
```

#### Crops & Varieties Page

- Table of crops with expandable rows showing varieties.
- Add/edit crop and variety inline or via dialog.
- Toggle active/inactive status.

#### Mandis Page

- Table of mandis with district, state, active status.
- Add/edit mandi.

#### Products Page

- Table of agrochemical products with category and active status.
- Add/edit product.

---

### 3. Mobile Impact

- No mobile code changes needed — mobile already fetches reference data via `seedReferenceData.ts`.
- Admin-managed master data changes will automatically appear on next login/sync.
- Consider adding a "Refresh Reference Data" button in the Profile/Settings screen.

---

## Part B: Expanded Reports & Analytics Dashboard (R-1, R-2, R-3)

### Current State
- Admin Portal dashboard shows: Summary cards (crop entries, market entries, demos, executives, farmers, villages), Productivity chart, Approval SLA chart.
- Mobile Reports screen (`ReportsScreen.tsx`) shows basic visit counts.
- No Market Intelligence or Product Performance analytics.

### Goal
- Comprehensive analytics dashboard in the Admin Portal.
- Three new analytics sections: Crop Intelligence, Market Intelligence, Product Performance.
- Key metrics, charts, and trends.

---

### 4. Market Intelligence Analytics (R-2)

#### Metrics

| Metric | Source |
|--------|--------|
| Total market entries | Count of `MarketVisit` + legacy `MandiArrival` |
| Entries this week / month | Filtered by date |
| Unique mandis covered | Distinct mandi IDs |
| Active reporters | Distinct `submitted_by` |

#### Charts

1. **Crop-wise Arrivals (Bar Chart)**
   - X-axis: Crop names.
   - Y-axis: Total arrival quantity (Qt).
   - Filterable by date range and mandi.

2. **Trend Distribution (Donut Chart)**
   - Segments: UP, DOWN, STEADY.
   - Shows the proportion of crop arrivals by market trend.
   - Requires Phase 1 `market_trend` field.

3. **Top Performing Markets (Horizontal Bar)**
   - Ranked by total arrival quantity.
   - Top 10 mandis.

4. **Arrival Trends Over Time (Line Chart)**
   - X-axis: Date (daily/weekly).
   - Y-axis: Total arrival quantity.
   - Multiple lines for different crops (filterable).

#### API Endpoint

```
GET /api/admin/analytics/market-intelligence/?days=30
```

Response:
```json
{
  "total_entries": 145,
  "unique_mandis": 12,
  "active_reporters": 8,
  "crop_arrivals": [
    { "crop": "Chilli", "total_quantity": 4500 },
    { "crop": "Soybean", "total_quantity": 12000 }
  ],
  "trend_distribution": {
    "up": 42, "down": 28, "steady": 75
  },
  "top_mandis": [
    { "mandi": "Guntur", "total_quantity": 8900 }
  ],
  "daily_arrivals": [
    { "date": "2026-06-15", "Chilli": 200, "Soybean": 500 }
  ]
}
```

---

### 5. Product Performance Analytics (R-3)

#### Metrics

| Metric | Source |
|--------|--------|
| Total demos conducted | Count of `ProductDemo` |
| Active demos (`demo_phase='before'`) | Filtered by phase |
| Completed demos (`demo_phase='completed'`) | Filtered by phase |
| Completion rate | `completed / total * 100` |

#### Charts

1. **Demo Tracking Overview (KPI Cards)**
   - Total demos, Active (before), Completed, Completion Rate.

2. **Before vs After Completion (Stacked Bar)**
   - Shows how many demos are still awaiting after-results vs completed.
   - Grouped by week or month.

3. **Product-wise Performance (Bar + Table)**
   - Products ranked by number of demos conducted.
   - Sub-breakdown by result (excellent / good / average / poor / no_effect).

4. **Crop-wise Demo Performance (Bar Chart)**
   - Which crops have the most demos?
   - Filterable by product.

5. **Result Distribution (Donut Chart)**
   - Segments: Excellent, Good, Average, Poor, No Effect.

6. **Completion Funnel (Funnel Chart)**
   - Total demos → Before photos submitted → After photos submitted → Result recorded.

7. **Product Adoption Over Time (Line Chart)**
   - X-axis: Date (weekly).
   - Y-axis: Number of new demos.
   - Multiple lines per product.

#### API Endpoint

```
GET /api/admin/analytics/product-performance/?days=30
```

Response:
```json
{
  "total_demos": 89,
  "active_demos": 34,
  "completed_demos": 55,
  "completion_rate": 61.8,
  "result_distribution": {
    "excellent": 12, "good": 25, "average": 10, "poor": 5, "no_effect": 3
  },
  "product_performance": [
    {
      "product": "Ampligo",
      "total": 15,
      "results": { "excellent": 5, "good": 7, "average": 3 }
    }
  ],
  "crop_performance": [
    { "crop": "Chilli", "total": 30 },
    { "crop": "Cotton", "total": 20 }
  ],
  "weekly_demos": [
    { "week": "2026-W24", "count": 12 }
  ]
}
```

---

### 6. Enhanced Crop Intelligence Analytics

Extend the existing `CropIntelligenceView`:

#### Additional Metrics

- **Condition trends over time:** Are crops improving or degrading?
- **Problem frequency:** Which problems (pest, disease, weather) are most reported?
- **District-wise coverage:** Heat map or table of visits per district.
- **Executive leaderboard:** Top performers by visit count.

#### Additional Charts

1. **Crop Health Trend (Stacked Area)**
   - X-axis: Week.
   - Y-axis: Percentage of crops in Good / Average / Poor condition.

2. **Problem Frequency (Horizontal Bar)**
   - Ranked by occurrence: pest, disease, weather, price, labour, other.

3. **Geographic Coverage (Table or Map)**
   - Visits per district, villages covered.

---

### 7. Admin Portal — Reports Page Restructure

Current: Single analytics page.
New: Tabbed reports dashboard:

```
┌─────────────────────────────────────────────────┐
│  Reports & Analytics                             │
│                                                  │
│  [Overview] [Crop Intel] [Market Intel] [Product]│
│  ─────────────────────────────────────────────── │
│                                                  │
│  (Tab content renders here)                      │
│                                                  │
└─────────────────────────────────────────────────┘
```

Each tab is a separate component:
- **Overview:** Existing summary + productivity (enhanced).
- **Crop Intelligence:** Crop health, problems, coverage.
- **Market Intelligence:** Arrivals, trends, top markets.
- **Product Performance:** Demos, completion, results.

All tabs have:
- Date range picker (7d / 30d / 90d / custom).
- Executive filter (dropdown).
- Export to CSV button.

---

### 8. Mobile Reports Screen Enhancement

The existing `ReportsScreen.tsx` on mobile shows basic visit counts.

Enhance to show:
- **Summary strip:** Total entries across all modules (today / week / month).
- **Module-wise breakdown cards:** 
  - Crop Intelligence: visits, farmers, crops.
  - Market Intelligence: entries, mandis, top crop.
  - Product Performance: demos, completed, success rate.
- **Link to Admin Portal:** "View detailed analytics on the web dashboard."

---

## Implementation Order

1. **Backend APIs:** Master data CRUD endpoints → Analytics endpoints.
2. **Admin Portal:** Master data management pages → Analytics dashboard tabs.
3. **Mobile:** Reports screen enhancement (optional, lower priority).

---

## Open Questions

1. **Chart library:** Admin Portal uses Recharts — sufficient for all proposed charts?
2. **Data refresh:** Should analytics data be real-time or cached with periodic refresh?
3. **Mobile reports:** How detailed should the mobile reports screen be? Full charts or summary-only with link to web?
4. **Master data audit:** Should master data changes (add/edit district) be logged in the audit trail?
5. **Permissions:** Should master data management be restricted to super-admins only, or all staff?

---

## Verification Plan

### Automated
- API tests for all master data CRUD endpoints.
- Analytics endpoints return correct aggregations.
- Verify soft-delete (is_active=False) hides items from mobile dropdowns.

### Manual
- Add a new district and block via Admin Portal → verify it appears in mobile on next sync.
- Add a new crop variety → verify it appears in the mobile form dropdown.
- View each analytics tab → verify charts render with test data.
- Export analytics data to CSV.
- Test with empty data (new deployment) → charts show empty states gracefully.
