# Phase 2 — Farmer Identity & Profiling

> **Goal:** Establish phone number as the unique farmer identifier. Enable auto-fill from past visits and group all visits under a single farmer profile.

**Depends on:** Phase 0
**Can run in parallel with:** Phase 1

---

## Requirements Covered

| Req ID | Requirement | Module |
|--------|-------------|--------|
| G-3 | One Phone Number = One Farmer | Global |
| C-1 | Farmer Profiling & Auto-Fill | Crop Intelligence |
| C-2 | Farmer Visit Grouping | Crop Intelligence |

---

## Estimated Effort

- **Total:** 8–12 days
- **Risk:** High — changes the fundamental data flow for farmer entry across modules; needs careful migration of existing data

---

## Current State Analysis

### How Farmers Are Currently Stored
- **FarmerVisit** (CMM): `farmer_name`, `mobile_number`, `village_name`, `block_name`, `district_name`, `total_land_acre` — all **free-text** fields directly on the visit record.
- **ProductDemo**: Same pattern — farmer details are free-text on the demo record.
- **MandiArrival**: No farmer association — market-level data.
- **`crops.Farmer` model**: Exists but is only used by legacy `CropEntry`. Not connected to `FarmerVisit` or `ProductDemo`.
- **`farmers` Django app**: Listed in backend directory but may be empty/unused.

### Problem
- Same farmer (e.g., "Ramesh, 9876543210") is stored as free-text on every visit.
- Typos, name variations, and missing phone numbers create duplicate "farmers."
- No way to view all visits for one farmer or pre-fill farmer details.

---

## Architecture Decision

### Option A: Upgrade existing `crops.Farmer` model ← **Recommended**
- The `Farmer` model already exists in `crops/models.py` with `name`, `phone_number`, `village` FK.
- **Extend it** to be the single source of truth for farmer identity.
- `FarmerVisit` and `ProductDemo` get a new `farmer` FK (nullable for backward compat).

### Option B: Create new `farmers/` Django app
- The `farmers/` directory exists but appears empty.
- Could create a new `FarmerProfile` model here.
- **Downside:** Another app to maintain; the `crops.Farmer` model would need to be deprecated.

**Decision:** Option A — extend `crops.Farmer`.

---

## 1. Backend Changes

### 1.1 Extend `crops.Farmer` Model

```python
class Farmer(models.Model):
    name = models.CharField(max_length=200)
    phone_number = models.CharField(max_length=15, unique=True)  # ← UNIQUE constraint
    village = models.ForeignKey(Village, on_delete=models.PROTECT, related_name='farmers', null=True, blank=True)
    
    # New fields for richer profiling
    village_name = models.CharField(max_length=200, blank=True)
    block_name = models.CharField(max_length=200, blank=True)
    district_name = models.CharField(max_length=200, blank=True)
    total_land_acre = models.DecimalField(max_digits=8, decimal_places=4, null=True, blank=True)
    
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, ...)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
```

**Key changes:**
- `phone_number` becomes `unique=True` — **One Phone Number = One Farmer**.
- Add `village_name`, `block_name`, `district_name`, `total_land_acre` as denormalized text fields (matching what forms capture).
- `updated_at` added for tracking profile changes.

### 1.2 Add Farmer FK to FarmerVisit and ProductDemo

```python
# crops/models.py — FarmerVisit
farmer = models.ForeignKey(
    'Farmer', on_delete=models.SET_NULL,
    null=True, blank=True,
    related_name='visits',
)

# product_demo/models.py — ProductDemo
farmer = models.ForeignKey(
    'crops.Farmer', on_delete=models.SET_NULL,
    null=True, blank=True,
    related_name='demos',
)
```

**Backward compatibility:**
- FK is nullable — existing records without a farmer profile remain valid.
- Free-text fields (`farmer_name`, `mobile_number`, etc.) are preserved on both models — they are the "as-captured" snapshot at visit time.

### 1.3 New API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/farmers/search/?phone=9876543210` | Search farmer by phone number |
| GET | `/api/farmers/<id>/` | Farmer profile detail |
| GET | `/api/farmers/<id>/visits/` | All visits for a farmer |
| POST | `/api/farmers/` | Create new farmer profile |
| PATCH | `/api/farmers/<id>/` | Update farmer profile |

### 1.4 Auto-Create / Auto-Link Logic

On `FarmerVisit` or `ProductDemo` submission:
1. If `mobile_number` is provided, look up `Farmer` by phone.
2. If found → set `farmer` FK on the visit/demo. Update farmer profile if any fields changed.
3. If not found → create new `Farmer` record, set FK.
4. If `mobile_number` is empty → leave `farmer` FK as null.

This logic lives in the serializer's `create()` method.

### 1.5 Data Migration

A one-time management command to link existing records:

```bash
python manage.py link_farmers_by_phone
```

Logic:
1. Scan all `FarmerVisit` records with non-empty `mobile_number`.
2. Group by `mobile_number`.
3. For each group: create/update a `Farmer` record, set FK on all visits in the group.
4. Same for `ProductDemo` records.
5. Report: `X farmers created, Y visits linked, Z demos linked, N unlinked (no phone)`.

---

## 2. Mobile Changes

### 2.1 WatermelonDB — New `farmers` Table

**Schema bump** (if combined with Phase 1: v10; if standalone: v9):

```typescript
// New table
tableSchema({
  name: 'farmers',
  columns: [
    { name: 'server_id', type: 'string', isOptional: true },
    { name: 'name', type: 'string' },
    { name: 'phone_number', type: 'string', isIndexed: true },
    { name: 'village_name', type: 'string' },
    { name: 'block_name', type: 'string' },
    { name: 'district_name', type: 'string' },
    { name: 'total_land_acre', type: 'number', isOptional: true },
    { name: 'created_at_local', type: 'number' },
  ],
}),

// Add to farmer_visits and product_demos
{ name: 'farmer_id', type: 'string', isOptional: true },
```

### 2.2 Farmer Lookup Flow (Auto-Fill)

When user enters/selects a phone number in Step 1 (any module):

```
User types phone number (10 digits)
       ↓
Query local `farmers` table by phone_number
       ↓
  Found?  ──YES──→  Auto-fill: name, village, block, district, land
       ↓                ↓
      NO            User can edit pre-filled values
       ↓
  Continue with blank fields (new farmer)
```

### 2.3 UI Changes — Step 1 (All Modules)

**File:** `src/screens/cropMonitoring/Step1_FarmerDetails.tsx` (and equivalent in Product Demo)

1. **Phone number input moves to the top** — it's the primary identifier now.
2. After entering 10 digits, trigger auto-lookup:
   - Search local WatermelonDB `farmers` table.
   - If online, also hit `/api/farmers/search/?phone=XXXX`.
3. If farmer found:
   - Pre-fill all fields with a visual indicator ("Auto-filled from profile").
   - Fields remain editable.
4. If not found:
   - Fields remain empty for manual entry.
   - After submission, a new farmer profile is created.
5. **Duplicate warning:** If user changes the phone number to one that already exists, show:
   > "A farmer profile already exists for this number (Ramesh, Village ABC). Would you like to use this profile?"

### 2.4 Farmer Visit Grouping (C-2)

**New screen:** `src/screens/cropMonitoring/FarmerProfileScreen.tsx`

- Accessible from: Crop Intelligence list → tap a farmer name, or from the activity feed.
- Displays:
  - Farmer header: name, phone, village, block, district, total land.
  - **Visit timeline:** All visits ordered chronologically.
  - **Stats:** Total visits, date range, crops grown.

```
┌─────────────────────────────────────┐
│  👨‍🌾 Ramesh Kumar                    │
│  📱 9876543210                      │
│  📍 Kotgir, Kinwat, Nanded         │
│  🌾 12 acres                       │
│                                     │
│  ─── 6 Visits ──────────────────── │
│                                     │
│  Jun 2026  │ Chilli (Teja) · Good   │
│  Mar 2026  │ Soybean · Average      │
│  Jan 2026  │ Chilli (Teja) · Good   │
│  ...                                │
└─────────────────────────────────────┘
```

### 2.5 Sync — Farmer Profile Seeding

On login / initial sync:
1. Seed the local `farmers` table from `/api/farmers/` (like districts/blocks/crop_master).
2. On subsequent syncs, merge any server-side farmer profile updates.

---

## 3. Admin Portal Changes

### 3.1 Farmer Profile Management

- New page: `/field-data/farmers/` — table of all farmer profiles.
- Columns: Name, Phone, Village, Block, District, Total Land, Visit Count, Last Visit Date.
- Click → opens farmer profile detail with visit history.

### 3.2 Duplicate Detection Report

- New utility: Admin can run a duplicate detection scan.
- Finds farmers with similar names but different phone numbers.
- Helps clean historical data.

---

## Open Questions

> [!IMPORTANT]
> These questions should be resolved before implementation begins.

1. **Phone number format:** Should we enforce 10-digit Indian mobile format? What about landlines?
2. **Farmer profile updates:** When a visit has different details (e.g., different village) than the stored profile, should the profile auto-update to the latest values?
3. **Product Demo association:** Should Product Demo entries also link to farmer profiles, or only Crop Intelligence?
4. **Offline farmer creation:** If a farmer is created offline and another executive creates the same farmer (same phone) offline — how do we handle the merge on sync?
5. **Historical data quality:** Many existing records may have no `mobile_number` or invalid numbers. Should we leave those unlinked or attempt fuzzy matching by name+village?

---

## Verification Plan

### Automated
- `python manage.py test` — all existing tests pass.
- New tests for:
  - Farmer unique constraint on phone_number.
  - Auto-create farmer on visit submission.
  - Auto-fill API endpoint.
  - Data migration command.

### Manual
- Create a visit with phone number → verify farmer profile created.
- Create a second visit with same phone → verify auto-fill works.
- View farmer profile → verify both visits appear in timeline.
- Test offline: create farmer offline, sync, verify profile exists on server.
- Test duplicate: try to create two farmers with the same phone → verify rejection.
