# Mandi Arrival Data Module — Implementation Plan

## Overview

Build a **fully featured, multi-step wizard** for capturing daily mandi arrival and price data. The new module mirrors the architecture of the **Crop Monitoring Module (CMM)** exactly — same hook pattern, same reducer, same sub-component per step, same `useReducer`-based state, same `InlinePicker`, same `PhotoPicker`, `LocationCapture`, `ReviewScreen`, and `SuccessScreen` patterns.

The existing `MandiEntryFormScreen.tsx` is a **single-page form** with no photo capture, no location, no repeatable crop variety rows, no review step, and no wizard UX. It will be **replaced** by the new wizard. The old file is kept only as a reference during build and then archived.

---

## Workflow Breakdown (from image)

| Step | Screen | Route Name |
|------|--------|------------|
| 1 | Mandi Details (Mandi picker, Date, Total Arrival) | Step 1 |
| 2 | Crop Variety Arrival — repeatable cards | Step 2 |
| 3 | Source of Information & Remark | Step 3 |
| 4 | Photos (min 2 required) | Step 4 |
| 5 | Location (auto-captured GPS) | Step 5 |
| 6 | Review & Confirm | Step `review` |
| — | Success Screen | — |

> **Step labelling in the UI:** "Step X of 6" (6 data-entry steps; success is not numbered).

---

## Architecture Decision

### Pattern: Mirror CMM exactly

| CMM | Mandi Arrival Equivalent |
|-----|--------------------------|
| `useCropMonitoringForm.ts` | `useMandiArrivalForm.ts` |
| `CropMonitoringFormScreen.tsx` | `MandiArrivalFormScreen.tsx` |
| `Step1_FarmerDetails.tsx` | `Step1_MandiDetails.tsx` |
| `Step2_CropDetails.tsx` | `Step2_CropVarieties.tsx` |
| `Step3_PhotosLocation.tsx` | `Step3_SourceRemark.tsx` |
| — | `Step4_Photos.tsx` |
| — | `Step5_Location.tsx` |
| `ReviewScreen.tsx` | `ReviewScreen.tsx` |
| `SuccessScreen.tsx` | `SuccessScreen.tsx` |

### State Management
- `useReducer` (same as CMM) — all wizard state in one place
- State persists during forward/backward navigation (no re-fetch)
- `reset()` for the "Add New Entry" CTA on success

### Local-first Offline
- On submit → `saveMandiArrivalWizardLocally()` in `database/operations.ts`
- The existing `MandiArrivalModel` and `mandi_arrivals` WatermelonDB table are already schema-correct BUT need **schema migration** to add `varieties_json`, `photos_json`, `latitude`, `longitude` columns (new in this module)
- Background sync service will push to the API when online

---

## Data Model Changes

### Current `mandi_arrivals` schema gaps (vs new wizard requirements)

The new wizard captures:
- Multiple **crop varieties** per mandi arrival (repeatable)
- **Photos** (minimum 2)
- **GPS Location**

The existing schema columns (`commodity`, `avg_rate`, `min_rate`, `max_rate`) model a **single crop per entry** — the new workflow supports multiple varieties.

### Schema Migration Plan

**Option A (Recommended — JSON columns, consistent with CMM):**

Add 4 new columns to `mandi_arrivals`:
```
varieties_json   string   // JSON: [{crop_variety_name, quantity_qt, top_rate, mostly_sales_rate, bottom_rate}]
photos_json      string   // JSON: [{uri, name, type}]   — same as farmer_visits
latitude         number   // optional
longitude        number   // optional
```

Keep existing `commodity` / `avg_rate` / `min_rate` / `max_rate` as **nullable legacy** — synced records from the server may still populate them. New wizard entries will use `varieties_json` instead.

**Required changes:**
1. `schema.ts` → bump `DB_SCHEMA_VERSION` (e.g. `2`) and add the 4 columns
2. `migrations.ts` → `addColumns` migration from v1 → v2
3. `MandiArrivalModel.ts` → add 4 `@field` decorators
4. `database/operations.ts` → add new `saveMandiArrivalWizardLocally()` function

> **Note:** WatermelonDB migrations are additive — no existing data is destroyed.

---

## New Type Definitions

**File:** `src/types/mandiArrival.ts` *(new file, mirrors `cropMonitoring.ts`)*

```typescript
import type { PhotoDraft, LocationDraft } from './cropMonitoring';

// One crop variety card within a mandi arrival entry
export interface CropVarietyDraft {
  localKey: string;             // client-side UUID (React key)
  crop_variety_name: string;    // e.g. "Soybean JS 9560"
  quantity_qt: string;          // arrival quantity in quintal (string for form)
  top_rate: string;             // ₹/Qt
  mostly_sales_rate: string;    // ₹/Qt
  bottom_rate: string;          // ₹/Qt
}

export type CropVarietyErrors = Partial<Record<keyof CropVarietyDraft, string>>;

export interface MandiDetailsDraft {
  mandi_id: string;             // stringified int (mandi selector)
  mandi_name: string;           // display name
  date: string;                 // YYYY-MM-DD
  total_arrival_qt: string;     // total all-crops arrival (quintal) — manual entry
}

export type MandiDetailsErrors = Partial<Record<keyof MandiDetailsDraft, string>>;

// 4 sources matching the workflow image
export type MandiSource = 'Trader' | 'Farmer' | 'FPS Staff' | 'Mandi';

// Wizard state — all 5 steps + review
export interface MandiArrivalFormState {
  step: 1 | 2 | 3 | 4 | 5 | 'review';
  mandiDetails: MandiDetailsDraft;
  varieties: CropVarietyDraft[];
  source: MandiSource | '';
  remark: string;
  photos: PhotoDraft[];         // reuse from cropMonitoring
  location: LocationDraft;     // reuse from cropMonitoring
}
```

---

## New Hook

**File:** `src/hooks/useMandiArrivalForm.ts` *(new file)*

Actions dispatched:
```
SET_STEP
UPDATE_MANDI_DETAILS   { payload: Partial<MandiDetailsDraft> }
ADD_VARIETY
UPDATE_VARIETY         { localKey, data: Partial<CropVarietyDraft> }
REMOVE_VARIETY         { localKey }
SET_SOURCE             { payload: MandiSource }
SET_REMARK             { payload: string }
ADD_PHOTO              { payload: PhotoDraft }
REMOVE_PHOTO           { payload: { uri } }
SET_LOCATION           { payload: LocationDraft }
RESET
```

Exposed interface:
```typescript
export interface UseMandiArrivalFormReturn {
  state: MandiArrivalFormState;
  setStep: (step) => void;
  updateMandiDetails: (data) => void;
  addVariety: () => void;
  updateVariety: (localKey, data) => void;
  removeVariety: (localKey) => void;
  setSource: (source) => void;
  setRemark: (text) => void;
  addPhoto: (photo) => void;
  removePhoto: (uri) => void;
  setLocation: (loc) => void;
  submit: () => Promise<{ id: string; mandi_name: string; variety_count: number }>;
  reset: () => void;
}
```

- `submit()` calls `saveMandiArrivalWizardLocally(state)`
- Default blank variety: `{ localKey: uuid, crop_variety_name: '', quantity_qt: '', top_rate: '', mostly_sales_rate: '', bottom_rate: '' }`

---

## Validation

**File:** `src/utils/mandiArrivalValidation.ts` *(new file)*

```typescript
validateStep1(mandiDetails: MandiDetailsDraft): MandiDetailsErrors
  // mandi_id: required
  // date: required, valid YYYY-MM-DD format
  // total_arrival_qt: required, positive number

validateStep2(varieties: CropVarietyDraft[]): Map<string, CropVarietyErrors>
  // each card: crop_variety_name required
  // quantity_qt: required, positive number
  // top_rate, mostly_sales_rate, bottom_rate: required, positive numbers

validateStep3(source: string, remark: string): { source?: string; remark?: string }
  // source: required
  // remark: max 300 chars

validateStep4(photos: PhotoDraft[]): { photos?: string }
  // min 2 photos required

validateStep5(location: LocationDraft): { location?: string }
  // location.captured === true required

hasMandiErrors(errors): boolean
hasVarietyErrors(errMap): boolean
```

---

## Files to Create

### 1. `src/types/mandiArrival.ts`
Full TypeScript interfaces (see above).

### 2. `src/hooks/useMandiArrivalForm.ts`
`useReducer`-based wizard state hook.

### 3. `src/utils/mandiArrivalValidation.ts`
Per-step validation functions.

### 4. `src/screens/mandiArrival/MandiArrivalFormScreen.tsx` (wizard shell)
- Same structure as `CropMonitoringFormScreen.tsx`
- Green top bar: `colors.primary` background, white title (17px 700), `ChevronLeft` icon
- **Progress bar + "Step X of 6" label** — right-aligned text above track
- Step renderer tree: steps 1→5 + `'review'`
- `handleSubmit` → `form.submit()` → sets `successData` → renders `SuccessScreen`
- `handleAddNew` / `handleDashboard` handlers

### 5. `src/screens/mandiArrival/Step1_MandiDetails.tsx`
- **Section header**: green circle "1" + "Mandi Details" heading
- **Mandi** — `InlinePicker` (loads from `mandis` WatermelonDB table → API fallback)
- **Date** — `FormInput`, default `todayISO()`, `keyboardType="default"`
- **Total Arrival (All Crops)** — `FormInput`, `keyboardType="decimal-pad"`, placeholder "Enter total arrival in quintal"
- Required field asterisks on all 3 fields
- NEXT button

### 6. `src/screens/mandiArrival/Step2_CropVarieties.tsx`
- **Section header**: green circle "2" + "Crop Variety Details"
- **`VarietyCard`** inline sub-component (one per variety):
  - **Crop Variety Name** — `InlinePicker` from `crop_master` table (includes variety options per crop)
  - **Arrival Quantity (in Quintal)** — `FormInput` numeric required
  - **Crop Rate (₹ per Quintal)** section label
  - **Top Rate / Mostly Sales Rate / Bottom Rate** — 3 `FormInput` in a 3-column row (same `rateRow` pattern)
  - Delete (×) button top-right, hidden when only 1 variety exists
- **"+ ADD ANOTHER VARIETY"** button — dashed border, `colors.primary`, `colors.primaryLight` bg (exact same style as "ADD ANOTHER CROP")
- `scrollRef` for auto-scroll when adding variety
- BACK + NEXT navigation row with validation

### 7. `src/screens/mandiArrival/Step3_SourceRemark.tsx`
- **Section header**: green circle "3" + "Source of Information"
- **Source** — `InlinePicker` dropdown (Trader | Farmer | FPS Staff | Mandi)
- **Remark** — optional `TextInput`, multiline, max 300 chars, counter `0/300` right-aligned
- BACK + NEXT navigation row

### 8. `src/screens/mandiArrival/Step4_Photos.tsx`
- **Section header**: green circle "4" + "Photos"
- **Required label**: "Photos (Minimum 2 photos required) *"
- Reuses `PhotoPicker` component with `minPhotos={2}`
- BACK + NEXT navigation row

### 9. `src/screens/mandiArrival/Step5_Location.tsx`
- **Section header**: green circle "5" + "Location Details"
- Reuses `LocationCapture` component — "Auto Captured Location" card showing lat/lng/accuracy
- "RECAPTURE LOCATION" button (icon + text, same as CMM Step3)
- BACK + NEXT navigation row

### 10. `src/screens/mandiArrival/ReviewScreen.tsx`
- "Review Details" heading + "Step 6 of 6" label
- **Mandi Details** card + EDIT → Step 1:
  - Mandi Name, Date, Total Arrival (All Crops)
- **Crop Variety Details (N)** card + EDIT → Step 2:
  - Table header: Variety Name | Qty (Qt) | Top Rate | Mostly Sales | Bottom Rate
  - One row per variety
- **Source** row
- **Remark** row
- **Photos** row (count)
- **Location** row (lat/lng string)
- BACK + SUBMIT ENTRY navigation row

### 11. `src/screens/mandiArrival/SuccessScreen.tsx`
- Exact same animation (spring scale + opacity sequence) as CMM `SuccessScreen`
- Title: "Mandi Arrival Entry\nSubmitted Successfully!"
- Subtitle: "Your mandi arrival data has been saved."
- "+ ADD NEW ENTRY" (primary) + "GO TO DASHBOARD" (secondary)

---

## Files to Modify

### 12. `src/components/InlinePicker.tsx` (EXTRACT — new shared component)
Extract the inline `InlinePicker` from `Step1_FarmerDetails.tsx` to a shared component. Both CMM Step1 and all Mandi Arrival steps will import from here. Update `Step1_FarmerDetails.tsx` to import it.

### 13. `src/database/schema.ts`
- Bump `DB_SCHEMA_VERSION` from `1` to `2`
- Add 4 columns to `mandi_arrivals` table:
  ```ts
  { name: 'varieties_json', type: 'string', isOptional: true },
  { name: 'photos_json',    type: 'string', isOptional: true },
  { name: 'latitude',       type: 'number', isOptional: true },
  { name: 'longitude',      type: 'number', isOptional: true },
  ```

### 14. `src/database/migrations.ts` (CREATE)
```ts
import { schemaMigrations, addColumns } from '@nozbe/watermelondb/Schema/migrations';

export default schemaMigrations({
  migrations: [
    {
      toVersion: 2,
      steps: [
        addColumns({
          table: 'mandi_arrivals',
          columns: [
            { name: 'varieties_json', type: 'string', isOptional: true },
            { name: 'photos_json',    type: 'string', isOptional: true },
            { name: 'latitude',       type: 'number', isOptional: true },
            { name: 'longitude',      type: 'number', isOptional: true },
          ],
        }),
      ],
    },
  ],
});
```

### 15. `src/database/index.ts`
Register migrations in the `Database` constructor.

### 16. `src/database/models/MandiArrivalModel.ts`
Add 4 new `@field` decorators:
```ts
@field('varieties_json')  varietiesJson!: string | null;
@field('photos_json')     photosJson!: string | null;
@field('latitude')        latitude!: number | null;
@field('longitude')       longitude!: number | null;
```

### 17. `src/database/operations.ts`
Add `saveMandiArrivalWizardLocally(state: MandiArrivalFormState)`:
- Serializes varieties array → `varietiesJson`
- Serializes photos array → `photosJson`
- Writes lat/lng, source, remark, mandi_id, date, total_arrival_qt
- Returns `{ id: string, mandi_name: string, variety_count: number }`
- Keep old `saveMandiArrivalLocally()` untouched

### 18. `src/navigation/types.ts`
Add `MandiArrivalForm: undefined` to `RootStackParamList`.

### 19. `src/navigation/AppNavigatorV2.tsx`
Import and register:
```tsx
import MandiArrivalFormScreen from '../screens/mandiArrival/MandiArrivalFormScreen';
// ...
<RootStack.Screen
  name="MandiArrivalForm"
  component={MandiArrivalFormScreen}
  options={{ headerShown: false }}
/>
```

### 20. `src/screens/MandiListScreen.tsx`
Update FAB `onPress`:
```tsx
onPress={() => navigation.navigate('MandiArrivalForm')}
```

---

## UI Consistency Checklist

All visual patterns must **exactly** match CMM:

| Element | Spec |
|---------|------|
| Top bar | `colors.primary` bg, white title 17px 700, `ChevronLeft` icon, `paddingTop: 48` |
| Progress bar | 4px track `colors.borderLight`, fill `colors.primary`, `borderRadius: 2` |
| Step indicator | "Step X of 6" right-aligned, `colors.primary`, 12px, above progress track |
| Section header | 28×28 green circle + white step number + heading 18px 700 |
| InlinePicker | `borderRadius: 12`, `borderColor: colors.border`, active: `colors.primaryLight` bg + `colors.primary` border, dropdown `elevation: 4` |
| FormInput | Existing `components/FormInput.tsx` (unchanged) |
| 3-column rate row | `flexDirection: 'row'`, `gap: 10`, each field `flex: 1` |
| Add variety button | Dashed border `colors.primary`, `borderRadius: 12`, `colors.primaryLight` bg, same as "ADD ANOTHER CROP" |
| Nav row | BACK (secondary) + NEXT (primary), `flex: 1`, `gap: 10` |
| Review card | `components/Card.tsx` with `SectionHeader` + EDIT link |
| Review row | Label left / value right, `borderBottomWidth: 0.5`, `borderBottomColor: colors.borderLight` |
| EDIT link | 12px 700 `colors.primary` |
| Success animation | Spring scale + opacity sequence, same as CMM |
| ScrollView bg | `colors.background` (`#F8F6F1`) |
| Surface color | `colors.surface` (`#FFFFFF`) for pickers, cards |
| KeyboardAvoidingView | `'padding'` iOS / `'height'` Android |

---

## Directory Structure After Implementation

```
src/
├── components/
│   └── InlinePicker.tsx          ← EXTRACT from Step1_FarmerDetails
├── hooks/
│   ├── useCropMonitoringForm.ts  (unchanged)
│   └── useMandiArrivalForm.ts    ← NEW
├── screens/
│   ├── mandiArrival/             ← NEW directory
│   │   ├── MandiArrivalFormScreen.tsx
│   │   ├── Step1_MandiDetails.tsx
│   │   ├── Step2_CropVarieties.tsx
│   │   ├── Step3_SourceRemark.tsx
│   │   ├── Step4_Photos.tsx
│   │   ├── Step5_Location.tsx
│   │   ├── ReviewScreen.tsx
│   │   └── SuccessScreen.tsx
│   ├── MandiEntryFormScreen.tsx  (keep — not deleted)
│   └── MandiListScreen.tsx       ← MODIFY FAB target
├── types/
│   ├── cropMonitoring.ts         (unchanged)
│   └── mandiArrival.ts           ← NEW
├── utils/
│   └── mandiArrivalValidation.ts ← NEW
├── database/
│   ├── schema.ts                 ← MODIFY (version 2 + 4 columns)
│   ├── migrations.ts             ← CREATE
│   ├── index.ts                  ← MODIFY (register migrations)
│   └── models/
│       └── MandiArrivalModel.ts  ← MODIFY (4 new @field decorators)
└── navigation/
    ├── types.ts                  ← MODIFY (add MandiArrivalForm route)
    └── AppNavigatorV2.tsx        ← MODIFY (register new screen + import)
```

---

## Implementation Order

1. `src/types/mandiArrival.ts`
2. `src/utils/mandiArrivalValidation.ts`
3. `src/hooks/useMandiArrivalForm.ts`
4. Schema + model changes (`schema.ts`, `migrations.ts`, `index.ts`, `MandiArrivalModel.ts`)
5. `src/database/operations.ts` — add `saveMandiArrivalWizardLocally()`
6. Extract `InlinePicker` to `src/components/InlinePicker.tsx` + update CMM Step1 import
7. Step sub-screens (Step1 → Step5)
8. `ReviewScreen.tsx` and `SuccessScreen.tsx`
9. `MandiArrivalFormScreen.tsx` (wizard shell)
10. Navigation wiring (`types.ts`, `AppNavigatorV2.tsx`)
11. Update `MandiListScreen.tsx` FAB target
12. End-to-end test (forward, back, validation, submit, success)

---

## Open Questions

> [!IMPORTANT]
> **Q1: Crop variety picker in Step 2** — Should the variety dropdown load from the existing `crop_master` WatermelonDB table (same as CMM Step 2), or should the user type a free-text variety name? The workflow image shows a dropdown ("Select crop variety"). Plan assumes `crop_master` offline cache.

> [!IMPORTANT]
> **Q2: Total arrival vs sum of varieties** — The workflow image shows "Total Arrival (All Crops)" as a separate manual entry in Step 1, in addition to individual variety quantities in Step 2. Should this remain a manual free-entry field, or be auto-calculated as the sum of Step 2 variety quantities? Manual entry matches the image exactly.

> [!IMPORTANT]
> **Q3: Source options & type update** — Workflow image shows 4 sources: **Trader, Farmer, FPS Staff, Mandi**. The existing `MandiSource` type in `types/index.ts` only has `'trader' | 'farmer' | 'official'`. New type in `mandiArrival.ts` uses the 4-option set. Should the old type in `types/index.ts` also be updated for consistency?

> [!NOTE]
> **Q4: Old `MandiEntryFormScreen`** — After the new wizard is live, should the old single-page form be deleted, or kept as a legacy fallback?

> [!NOTE]
> **Q5: Schema migration** — Bumping DB version will trigger WatermelonDB migration on first launch. Existing `mandi_arrivals` data is preserved. This is safe but warrants a fresh install test on a device with existing records.
