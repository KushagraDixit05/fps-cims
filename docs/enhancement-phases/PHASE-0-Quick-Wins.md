# Phase 0 — Quick Wins

> **Goal:** Ship low-risk, cross-cutting improvements that users see immediately.
> No data-model migrations, no breaking API changes, no new Django apps.

---

## Requirements Covered

| Req ID | Requirement | Module |
|--------|-------------|--------|
| G-1 | Future Date Selection Support | All three modules |
| G-2 | Home Dashboard Activity Feed (Recent Visits → Recent Activities) | Home Dashboard |
| G-6 | Module Naming Standardization (remaining mobile work) | Mobile, Admin Portal |
| G-7 | Share Review Details | All three modules |
| M-6 | Merge Steps 4 & 5 (Photos + Location) | Market Intelligence |
| P-2 | Remarks Field — surface existing `remark` in UI/review/export | Product Performance |

---

## Estimated Effort

- **Total:** 3–5 days
- **Risk:** Low — no schema migrations, no API contract changes

---

## 1. Future Date Selection Support (G-1, C-4)

### Current State
- Date pickers in all three module wizards restrict selection to past/present dates.

### Changes Required

#### Mobile — All Modules
- **File:** `src/screens/cropMonitoring/Step1_FarmerDetails.tsx`
  - Remove `maximumDate={new Date()}` constraint from DateTimePicker.
  - After date selection, if `selectedDate > today`, show a confirmation Alert:
    > "You have selected a future date. Please confirm that this entry represents planned or anticipated information."
  - On "Continue" → accept the date. On "Cancel" → revert to previous value.

- **File:** `src/screens/mandiArrival/Step1_MandiDetails.tsx`
  - Same pattern — remove max date, add future-date warning popup.

- **File:** `src/screens/productDemo/Step1_FarmerDetails.tsx`
  - Same pattern for `demo_date` field.

#### Shared Helper (recommended)
- **New file:** `src/utils/futureDateWarning.ts`
  ```typescript
  export const showFutureDateWarning = (
    selectedDate: Date,
    onConfirm: () => void,
    onCancel: () => void,
  ) => {
    if (selectedDate > new Date()) {
      Alert.alert(
        'Future Date Selected',
        'You have selected a future date. Please confirm that this entry represents planned or anticipated information.',
        [
          { text: 'Cancel', style: 'cancel', onPress: onCancel },
          { text: 'Continue', onPress: onConfirm },
        ],
      );
    } else {
      onConfirm();
    }
  };
  ```

### Acceptance Criteria
- [ ] Future dates are selectable in all three modules.
- [ ] Warning popup appears when a future date is chosen.
- [ ] User can dismiss the warning and revert, or acknowledge and proceed.
- [ ] No validation errors on submission with a future date.

---

## 2. Home Dashboard Activity Feed (G-2)

### Current State
- HomeScreen section title says **"RECENT VISITS"**.
- Only shows `FarmerVisit` records from WatermelonDB / API.
- `MandiArrival` and `ProductDemo` entries are not displayed.

### Changes Required

#### Mobile — `src/screens-v2/HomeScreen.tsx`

1. **Rename section title:** `"RECENT VISITS"` → `"RECENT ACTIVITIES"`

2. **Unified Activity type:**
   ```typescript
   type ActivityItem = {
     id: string;
     module: 'crop_intelligence' | 'market_intelligence' | 'product_performance';
     farmer_name?: string;      // CMM + Product Demo
     mandi_name?: string;       // Market Intelligence
     date: string;              // ISO string — submitted_at or date
     location: string;          // "village · block" or "mandi name"
     primary_crop: string;      // crop_name or commodity
     status: 'synced' | 'pending';
   };
   ```

3. **Load data from all three WatermelonDB tables:**
   - `farmer_visits` (existing)
   - `mandi_arrivals` (new — query, convert to ActivityItem)
   - `product_demos` (new — query, convert to ActivityItem)

4. **Merge + sort:** Combine all three arrays, sort descending by `date`, take top 10.

5. **Activity card rendering:**
   - Show a module badge/icon (Leaf / Store / Package) to identify the module type.
   - Show `farmer_name` or `mandi_name` as primary text.
   - Show `primary_crop`, `date`, and `location` as secondary.
   - Show `status` badge (synced / pending).

6. **Navigation on tap:**
   - Crop Intelligence → `CropMonitoringDetail`
   - Market Intelligence → `MandiArrivalDetail` (if detail screen exists, else alert)
   - Product Performance → `ProductDemoDetail`

#### API Phase (online enrichment)
- Existing: `getFarmerVisits(1)` already fetches page 1 of visits.
- New: Also call `getMandiArrivals(1)` and `getProductDemos(1)` (if list endpoints exist).
- Merge server results with local pending records, same as current logic but across all modules.

### Acceptance Criteria
- [ ] Section title reads "RECENT ACTIVITIES".
- [ ] Feed shows entries from all three modules intermixed, sorted by date descending.
- [ ] Each card displays: module icon, farmer/mandi name, date, location, crop, sync status.
- [ ] Tapping a card navigates to the correct detail screen for that module.
- [ ] Works offline (WatermelonDB first) and enriches when online.

---

## 3. Module Naming Standardization (G-6)

### Current State
- Admin portal and reports already use new names.
- Mobile app partially updated — HomeScreen tiles use new names, but other screens still reference old names.

### Changes Required

#### Mobile — Global Find & Replace

| Old | New | Files to update |
|-----|-----|-----------------|
| `Crop Monitoring` | `Crop Intelligence` | Navigation titles, form headers, list headers, success screens |
| `Mandi Arrival` | `Market Intelligence` | Same |
| `Product Demo` | `Product Performance` | Same |

**Key files:**
- `src/navigation/AppNavigatorV2.tsx` — screen titles
- `src/screens/cropMonitoring/*.tsx` — headers and labels
- `src/screens/mandiArrival/*.tsx` — headers and labels
- `src/screens/productDemo/*.tsx` — headers and labels
- `src/screens-v2/SidebarContent.tsx` — drawer menu items
- `src/screens/ReportsScreen.tsx` — report labels

#### Admin Portal — Audit
- Verify all page titles, sidebar items, breadcrumbs, and CSV column headers use new names.
- Expected: mostly done, but verify `admin-portal/src/components/layout/Sidebar.tsx`.

#### CSV Exports — Backend
- Verify `admin_portal/views.py` export filenames use new terminology:
  - `fps-farmer-visits-*.csv` → `fps-crop-intelligence-*.csv` (optional rename)
  - `fps-mandi-arrivals-*.csv` → `fps-market-intelligence-*.csv` (optional rename)
  - `fps-product-demos-*.csv` → `fps-product-performance-*.csv` (optional rename)

### Acceptance Criteria
- [ ] All user-facing strings in the mobile app use the new module names.
- [ ] Admin portal sidebar, page headers, and breadcrumbs use new names.
- [ ] No user-visible references to "Crop Monitoring", "Mandi Arrival", or "Product Demo" remain.

---

## 4. Share Review Details (G-7)

### Current State
- Review screens exist for all three modules but have no share functionality.
- CMM: `src/screens/cropMonitoring/ReviewScreen.tsx`
- Market Intelligence: `src/screens/mandiArrival/ReviewScreen.tsx`
- Product Performance: `src/screens/productDemo/ReviewScreen.tsx`

### Changes Required

#### Approach: Text Summary First (Option B)

**Rationale:** Text sharing via `react-native`'s built-in `Share` API requires zero new dependencies. Image card generation (Option A) requires `react-native-view-shot` and can be a fast-follow.

#### Implementation

1. **New shared utility:** `src/utils/shareReviewDetails.ts`
   ```typescript
   import { Share, Platform } from 'react-native';

   type SharePayload = {
     module: string;
     farmerName?: string;
     mandiName?: string;
     date: string;
     location: string;
     cropDetails: string;
     observations?: string;
     summary?: string;
   };

   export const shareReviewDetails = async (payload: SharePayload) => {
     const lines = [
       `📋 ${payload.module} Report`,
       `━━━━━━━━━━━━━━━━━━━`,
       payload.farmerName ? `👨‍🌾 Farmer: ${payload.farmerName}` : '',
       payload.mandiName ? `🏪 Market: ${payload.mandiName}` : '',
       `📅 Date: ${payload.date}`,
       `📍 Location: ${payload.location}`,
       `🌾 Crop: ${payload.cropDetails}`,
       payload.observations ? `📝 Observations: ${payload.observations}` : '',
       payload.summary ? `\n${payload.summary}` : '',
       `\n— Shared via Farm Prosperity Solutions`,
     ].filter(Boolean).join('\n');

     await Share.share({
       message: lines,
       title: `${payload.module} Report`,
     });
   };
   ```

2. **Add Share button to all three Review screens:**
   - Add a share icon button (lucide `Share2` icon) to the header/top-right.
   - On press, call `shareReviewDetails()` with the current form data.

#### Fast-Follow (not in Phase 0 scope)
- **Option A — Image card:** Use `react-native-view-shot` to capture the review screen as a PNG, then share the image. This can be added in a follow-up PR.

### Acceptance Criteria
- [ ] Share button visible on all three Review Detail screens.
- [ ] Tapping Share opens the OS share sheet with a formatted text summary.
- [ ] Shared text includes: module name, farmer/market name, date, location, crop details, observations.
- [ ] Works on both Android share sheet and clipboard.

---

## 5. Merge Steps 4 & 5 — Market Intelligence (M-6)

### Current State
- Market Intelligence wizard has 5 steps:
  - Step 1: Market Details
  - Step 2: Crop Varieties
  - Step 3: Source & Remark
  - Step 4: Photos
  - Step 5: Location
- Step 4 and Step 5 are separate screens.

### Changes Required

#### Mobile — `src/screens/mandiArrival/`

1. **Merge `Step4_Photos.tsx` and `Step5_Location.tsx`:**
   - Combine into a single `Step4_PhotosLocation.tsx`.
   - Layout: Photos section on top, Location section below.
   - Location is **optional** — user may submit without capturing location.

2. **Update wizard flow:**
   - `MandiArrivalFormScreen.tsx`: Update step count from 5 → 4.
   - `useMandiArrivalForm.ts`: Remove step 5 from the reducer. Step 4 now handles both photos and location.
   - Step navigation: Step 3 → Step 4 (Photos + Location) → Review.

3. **Reuse existing `LocationCapture` component** — already used in CMM's Step 3.

4. **Update progress bar** to reflect 4 steps instead of 5.

### Acceptance Criteria
- [ ] Market Intelligence wizard shows 4 steps (was 5).
- [ ] Step 4 includes both Photos and Location sections.
- [ ] Location is optional.
- [ ] Existing data integrity is maintained — no schema changes needed (GPS fields already exist on `MandiArrival` model).

---

## 6. Remarks Field — Product Performance (P-2)

### Current State
- `ProductDemo` Django model already has a `remark` field (`TextField(blank=True)`).
- The mobile form already captures `remark` in Step 4 (`Step4_PhotosResultRemark.tsx`) — field exists but needs verification.
- **Missing:** `remark` may not be displayed in the Review screen or exported in CSV.

### Changes Required

1. **Mobile — Review screen:** Verify `remark` is rendered in `src/screens/productDemo/ReviewScreen.tsx`. If missing, add a "Remarks" section.

2. **Mobile — Detail screen:** Verify `remark` is shown in the Product Demo detail view.

3. **Admin Portal — Detail view:** Verify `remark` appears in the Product Demo detail panel.

4. **CSV Export:** Verify `remark` column exists in `admin_portal/views.py` → `ProductDemoExportView`. *(Currently present in export — column "Remark" at position index 19.)*

### Acceptance Criteria
- [ ] Remarks visible on Product Performance Review screen.
- [ ] Remarks visible on Product Performance Detail screen (mobile + admin).
- [ ] Remarks exported in CSV.

---

## Verification Plan

### Automated
- Run existing backend tests: `python manage.py test`
- Verify CSV exports have correct column headers.

### Manual
- Test future date selection in all three module wizards.
- Verify Recent Activities feed shows entries from all three modules.
- Test Share button on all Review screens.
- Verify Market Intelligence wizard is 4 steps.
- Verify module names throughout the app.
- Build release APK and test on physical device.
