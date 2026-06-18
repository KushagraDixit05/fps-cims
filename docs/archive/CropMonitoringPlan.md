# Crop Monitoring Module — Implementation Plan

> This plan covers everything needed to build the Crop Monitoring module end-to-end — backend, mobile screens, data model changes, and validation rules — based on the approved UX flow in `crop_monitoring.jpeg`.

---

## 1. Overview

The Crop Monitoring module allows field executives to log a **single farmer visit** that captures:
- Farmer basic details (who was visited, where)
- **One or more crop entries** per visit (multi-crop support)
- Field photos (minimum 2, auto-captured GPS per photo)
- A single GPS location for the overall visit
- A free-text remark

The form is a **3-step wizard** with a dynamic middle step (Step 2 repeats per crop added).

---

## 2. Complete User Flow (8 Screens)

```
Screen 1: Farmer Basic Details   (Step 1 of 3)
     ↓ NEXT
Screen 2: Crop Details — Crop 1  (Step 2 of 3)
     ↓ ADD ANOTHER CROP → Crop 2, Crop 3 ... (same step, new card)
     ↓ NEXT
Screen 3: Photos, Location & Remark  (Step 3 of 3)
     ↓ SUBMIT
Screen 4: Review & Confirm
     ↓ SUBMIT ENTRY
Screen 5: Success Screen
     ↓ ADD NEW ENTRY / GO TO DASHBOARD
Screen 6: Dashboard (updated with new entry)
```

---

## 3. Screen-by-Screen Field Specification

### Screen 1 — Farmer Basic Details (Step 1 of 3)

| Field | Type | Mandatory | Notes |
|---|---|---|---|
| Farmer Name | Text input | ✅ Yes | Free text |
| Mobile Number | Number input | ✅ Yes | 10-digit validation |
| Village Name | Text input | ✅ Yes | Free text (will become dropdown in Phase 3 with cached data) |
| Block Name | Dropdown | ✅ Yes | Master list from API (`/api/villages/`) |
| District Name | Dropdown | ✅ Yes | Derived from Block selection |
| Total Land (Acre) | Number input | ✅ Yes | Decimal allowed (e.g. 10.50) |

**Navigation:** Single "NEXT" button at bottom. Validates all fields before proceeding.

---

### Screen 2 — Crop Details (Step 2 of 3, repeatable)

Each crop is a collapsible card labeled "Crop Details - N". The user can add unlimited crops by tapping **"+ ADD ANOTHER CROP"**. Each card has a **delete icon (🗑)** in the top-right corner (except the first crop card — at least 1 crop required).

**Per-crop fields:**

| Field | Type | Mandatory | Notes |
|---|---|---|---|
| Crop | Dropdown | ✅ Yes | Master list (e.g. Chilli, Soybean, Pigeon Pea) |
| Variety | Dropdown | ✅ Yes | Filtered by selected Crop (e.g. Teja, JS 9560, ICPL 87119) |
| Date of Sowing | Date Picker | ✅ Yes | Calendar UI, past dates only |
| Current Area (Acre) | Number input | ✅ Yes | Decimal allowed |
| Last Year Area (Acre) | Number input | ❌ No | Decimal allowed |
| This Year Area (Acre) | Number input | ✅ Yes | Decimal allowed |
| Crop Stage | Dropdown | ✅ Yes | seedling / vegetative / flowering / fruiting / harvesting / post_harvest |
| Crop Condition | Button group | ✅ Yes | Good / Average / Poor (single select, pill buttons) |
| Problems | Multi-checkbox | ✅ Yes | Pest / Disease / Weather / Price / Labour / Other |
| Other Problem (specify) | Text input | ❌ No | Only visible when "Other" is checked |

**Navigation:** "NEXT →" proceeds to Step 3. "+ ADD ANOTHER CROP" appends a new crop card (scrolls to it automatically).

---

### Screen 3 — Photos, Location & Remark (Step 3 of 3)

| Field | Type | Mandatory | Notes |
|---|---|---|---|
| Photos | Image picker (multi) | ✅ Yes | Minimum 2 photos required. Camera + gallery. Thumbnails shown with ✕ delete button per photo. |
| Location (Auto Captured) | GPS coordinates | ✅ Yes | Auto-fetched on screen load. Shows "22.5937° N, 76.9124° E" format. Refresh icon to re-capture. |
| Remark | Textarea | ❌ No | 0/500 character counter |

**Navigation:** "BACK" returns to Step 2. "SUBMIT" → Review screen.

---

### Screen 4 — Review & Confirm

Read-only summary of everything entered. Two editable sections with "EDIT" links.

**Farmer Details section:**
- Farmer Name, Mobile Number, Village / Block, District, Total Land (Acre)

**Crops Added (N) section:**
- Table: Crop | Variety | Area | Stage | Condition (one row per crop)

**Photos / Location / Remark section:**
- Photos: thumbnail count shown as "N photos"
- Location: "Captured" / "Not captured"
- Remark: "Yes" / "No" (or actual text)

**Navigation:** "BACK" → Step 3. "SUBMIT ENTRY" → Success screen.

---

### Screen 5 — Success Screen

- Large animated checkmark
- "Entry Submitted Successfully!" heading
- "Your crop monitoring data has been saved." subtext
- Two CTA buttons: **"+ ADD NEW ENTRY"** (resets wizard) and **"GO TO DASHBOARD"**

---

### Screen 6 — Dashboard (updated)

**Today's Summary strip:** Today | This Week | This Month | Team Members (counts)

**Recent Entries list:**
- Entry date, Farmer Name, Village/Block, "N Crops" badge
- Tappable → navigates to CropDetailScreen

---

## 4. Backend Changes Required

### 4.1 New / Modified Django Models

#### `crops.CropEntry` — **Modify existing model**

The current `CropEntry` model stores a single crop per entry. The new design allows multiple crops per farmer visit. Two approaches:

**Recommended approach: Extract `CropEntry` into a parent `FarmerVisit` + child `CropRecord`**

```
FarmerVisit (new model)
├── id (UUID)
├── executive → FK to User
├── farmer_name (CharField)
├── mobile_number (CharField, 10 chars)
├── village_name (CharField)
├── block_name (CharField)
├── district_name (CharField)
├── total_land_acre (DecimalField)
├── latitude (FloatField)
├── longitude (FloatField)
├── location (PostGIS Point, auto-populated from lat/lng)
├── remark (TextField, blank=True)
├── submitted_at (DateTimeField, auto_now_add)
├── local_id (CharField) ← Phase 3 sync key
└── is_synced (BooleanField, default=True) ← Phase 3 flag

CropRecord (new model)
├── id (UUID)
├── visit → FK to FarmerVisit (related_name='crops')
├── crop_name (CharField) ← selected from master
├── variety (CharField)
├── date_of_sowing (DateField)
├── current_area_acre (DecimalField)
├── last_year_area_acre (DecimalField, null=True)
├── this_year_area_acre (DecimalField)
├── crop_stage (CharField, choices: seedling/vegetative/flowering/fruiting/harvesting/post_harvest)
├── crop_condition (CharField, choices: good/average/poor)
├── problems (ArrayField or JSONField — list of: pest/disease/weather/price/labour/other)
├── other_problem_detail (CharField, blank=True)
└── sort_order (PositiveSmallIntegerField, default=0) ← preserves UI order

CropPhoto (new model)
├── id (UUID)
├── visit → FK to FarmerVisit (related_name='photos')
├── image (ImageField → upload_to='crop_photos/%Y/%m/')
└── uploaded_at (DateTimeField, auto_now_add)
```

**Note on existing `CropEntry`:** The old model (`crops.CropEntry`) had a single crop per entry. If data already exists in it, keep the model intact and introduce `FarmerVisit` as a parallel model. Migration script can be written later to move old records.

#### `crops.CropMaster` — **New master data model**

```
CropMaster
├── id (AutoField)
├── crop_name (CharField, unique)
└── is_active (BooleanField, default=True)

CropVariety
├── id (AutoField)
├── crop → FK to CropMaster
├── variety_name (CharField)
└── is_active (BooleanField, default=True)
```

These are seeded via a management command or Django admin. The mobile app fetches them for dropdown population.

---

### 4.2 New API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/crop-master/` | List all crops with their varieties |
| GET | `/api/blocks/?district=Indore` | Block master list, optionally filtered by district |
| GET | `/api/districts/` | District master list |
| POST | `/api/farmer-visits/` | Submit a complete visit (farmer + crops + photos) |
| GET | `/api/farmer-visits/` | List visits for current executive (paginated) |
| GET | `/api/farmer-visits/<uuid>/` | Visit detail |
| GET | `/api/farmer-visits/summary/` | Dashboard counts (today / week / month / team) |
| PATCH | `/api/farmer-visits/<uuid>/` | Edit a visit (for "EDIT" link from Review screen) |

**POST `/api/farmer-visits/` — Request body (multipart/form-data):**
```json
{
  "farmer_name": "Ramesh Patidar",
  "mobile_number": "9876543210",
  "village_name": "Rampura",
  "block_name": "Depalpur",
  "district_name": "Indore",
  "total_land_acre": "10.00",
  "latitude": 22.5937,
  "longitude": 76.9124,
  "remark": "High temperature stress observed",
  "crops": [
    {
      "crop_name": "Chilli",
      "variety": "Teja",
      "date_of_sowing": "2024-07-15",
      "current_area_acre": "2.50",
      "last_year_area_acre": null,
      "this_year_area_acre": "2.50",
      "crop_stage": "flowering",
      "crop_condition": "good",
      "problems": ["pest"],
      "other_problem_detail": "",
      "sort_order": 0
    },
    {
      "crop_name": "Soybean",
      "variety": "JS 9560",
      "date_of_sowing": "2024-10-07",
      "current_area_acre": "3.50",
      "last_year_area_acre": "3.00",
      "this_year_area_acre": "3.50",
      "crop_stage": "vegetative",
      "crop_condition": "average",
      "problems": ["pest", "disease"],
      "other_problem_detail": "High temperature",
      "sort_order": 1
    }
  ],
  "photos": [<file>, <file>]
}
```

**Response (201 Created):**
```json
{
  "id": "uuid",
  "submitted_at": "2024-05-20T14:30:00Z",
  "farmer_name": "Ramesh Patidar",
  "crop_count": 2,
  "location": { "lat": 22.5937, "lng": 76.9124 }
}
```

---

### 4.3 Serializers Required

- `CropMasterSerializer` (nested with `CropVarietySerializer`)
- `CropRecordSerializer` (for write: nested inside FarmerVisit)
- `CropPhotoSerializer`
- `FarmerVisitCreateSerializer` (write — accepts nested `crops` list + multipart `photos`)
- `FarmerVisitListSerializer` (read — lightweight, for list views)
- `FarmerVisitDetailSerializer` (read — full detail including all crops and photos)
- `FarmerVisitSummarySerializer` (for dashboard counts)

---

### 4.4 Django Admin Setup

- `FarmerVisitAdmin` with inline `CropRecordInline` and `CropPhotoInline`
- `CropMasterAdmin` with inline `CropVarietyInline`
- Seed management command: `python manage.py seed_crop_master` — loads initial crop/variety data

---

## 5. Mobile — File & Component Plan

### 5.1 New Files to Create

```
src/
├── api/
│   └── cropMonitoring.ts          ← All API calls for this module
│
├── screens/
│   ├── cropMonitoring/
│   │   ├── CropMonitoringFormScreen.tsx   ← Wizard shell (manages step + state)
│   │   ├── Step1_FarmerDetails.tsx        ← Step 1 sub-component
│   │   ├── Step2_CropDetails.tsx          ← Step 2 sub-component (dynamic crop list)
│   │   ├── Step3_PhotosLocation.tsx       ← Step 3 sub-component
│   │   ├── ReviewScreen.tsx               ← Review & Confirm
│   │   └── SuccessScreen.tsx              ← Post-submit
│   │
│   └── HomeScreen.tsx                     ← UPDATE: new dashboard summary layout
│
├── components/
│   ├── CropCard.tsx               ← Single crop card (collapsible, deletable)
│   ├── PhotoPicker.tsx            ← Multi-photo picker with thumbnails
│   ├── LocationCapture.tsx        ← GPS auto-capture component
│   ├── ProblemCheckboxGroup.tsx   ← Pest/Disease/Weather/Price/Labour/Other
│   └── ConditionSelector.tsx      ← Good/Average/Poor button group
│
├── types/
│   └── cropMonitoring.ts          ← TypeScript interfaces for this module
│
└── hooks/
    └── useCropMonitoringForm.ts   ← Form state management hook
```

---

### 5.2 TypeScript Interfaces (`src/types/cropMonitoring.ts`)

```typescript
export type CropStage =
  | 'seedling' | 'vegetative' | 'flowering'
  | 'fruiting' | 'harvesting' | 'post_harvest';

export type CropCondition = 'good' | 'average' | 'poor';

export type ProblemType = 'pest' | 'disease' | 'weather' | 'price' | 'labour' | 'other';

export interface CropVariety {
  id: number;
  variety_name: string;
}

export interface CropMaster {
  id: number;
  crop_name: string;
  varieties: CropVariety[];
}

export interface CropRecordDraft {
  localKey: string;           // uuid for React key, not sent to server
  crop_name: string;
  variety: string;
  date_of_sowing: string;     // ISO date string YYYY-MM-DD
  current_area_acre: string;
  last_year_area_acre: string;
  this_year_area_acre: string;
  crop_stage: CropStage | '';
  crop_condition: CropCondition | '';
  problems: ProblemType[];
  other_problem_detail: string;
  sort_order: number;
}

export interface FarmerDetailsDraft {
  farmer_name: string;
  mobile_number: string;
  village_name: string;
  block_name: string;
  district_name: string;
  total_land_acre: string;
}

export interface PhotoDraft {
  uri: string;
  name: string;
  type: string;
}

export interface LocationDraft {
  latitude: number | null;
  longitude: number | null;
  captured: boolean;
}

export interface CropMonitoringFormState {
  step: 1 | 2 | 3 | 'review';
  farmerDetails: FarmerDetailsDraft;
  crops: CropRecordDraft[];
  photos: PhotoDraft[];
  location: LocationDraft;
  remark: string;
}

// API response types
export interface FarmerVisitSummary {
  today: number;
  this_week: number;
  this_month: number;
  team_members: number;
}

export interface RecentVisit {
  id: string;
  farmer_name: string;
  village_name: string;
  block_name: string;
  crop_count: number;
  submitted_at: string;
}
```

---

### 5.3 API Module (`src/api/cropMonitoring.ts`)

```typescript
// Functions to implement:

getCropMaster(): Promise<CropMaster[]>
// GET /api/crop-master/

getDistricts(): Promise<District[]>
// GET /api/districts/

getBlocks(districtId?: number): Promise<Block[]>
// GET /api/blocks/?district=<id>

submitFarmerVisit(payload: FormData): Promise<{ id: string }>
// POST /api/farmer-visits/   (multipart/form-data)

getFarmerVisits(page?: number): Promise<PaginatedResponse<RecentVisit>>
// GET /api/farmer-visits/

getFarmerVisitDetail(id: string): Promise<FarmerVisitDetail>
// GET /api/farmer-visits/<uuid>/

getVisitSummary(): Promise<FarmerVisitSummary>
// GET /api/farmer-visits/summary/
```

---

### 5.4 Form State Hook (`src/hooks/useCropMonitoringForm.ts`)

Manages the entire wizard state in a single `useReducer`. Actions:

```typescript
type FormAction =
  | { type: 'SET_STEP'; payload: CropMonitoringFormState['step'] }
  | { type: 'UPDATE_FARMER_DETAILS'; payload: Partial<FarmerDetailsDraft> }
  | { type: 'ADD_CROP' }
  | { type: 'UPDATE_CROP'; payload: { localKey: string; data: Partial<CropRecordDraft> } }
  | { type: 'REMOVE_CROP'; payload: { localKey: string } }
  | { type: 'ADD_PHOTO'; payload: PhotoDraft }
  | { type: 'REMOVE_PHOTO'; payload: { uri: string } }
  | { type: 'SET_LOCATION'; payload: LocationDraft }
  | { type: 'SET_REMARK'; payload: string }
  | { type: 'RESET' };
```

---

### 5.5 Navigation Updates (`src/navigation/types.ts` and `AppNavigator.tsx`)

Add to `RootStackParamList`:
```typescript
CropMonitoringForm: undefined;          // starts fresh wizard
CropMonitoringReview: undefined;        // review screen (gets state from context/hook)
CropMonitoringSuccess: undefined;       // success screen
```

Add to `MainTabParamList`:
- The bottom tab "Add Entry" should navigate to `CropMonitoringForm` (already partially present as `CropEntryFormScreen` — to be replaced).

---

## 6. Validation Rules

### Step 1 Validations
| Field | Rule |
|---|---|
| Farmer Name | Required, min 2 chars |
| Mobile Number | Required, exactly 10 digits, numeric |
| Village Name | Required |
| Block Name | Required, must select from dropdown |
| District Name | Required, must select from dropdown |
| Total Land | Required, > 0, max 4 decimal places |

### Step 2 Validations (per crop card)
| Field | Rule |
|---|---|
| Crop | Required, must select |
| Variety | Required, must select |
| Date of Sowing | Required, must be a past date |
| Current Area | Required, > 0 |
| This Year Area | Required, > 0 |
| Crop Stage | Required |
| Crop Condition | Required |
| Problems | At least 1 must be selected |
| Other Problem Detail | Required if "Other" is checked |
| Min crops | At least 1 crop card required |
| Crop uniqueness | Same crop+variety combo should warn (not hard block) |

### Step 3 Validations
| Field | Rule |
|---|---|
| Photos | Minimum 2 photos |
| Location | Must be captured (GPS must resolve successfully) |
| Remark | Optional, max 500 chars |

---

## 7. Component Specifications

### `CropCard.tsx`

Props:
```typescript
interface CropCardProps {
  index: number;           // "Crop Details - 1", "Crop Details - 2" etc.
  data: CropRecordDraft;
  cropMaster: CropMaster[];
  onChange: (data: Partial<CropRecordDraft>) => void;
  onDelete?: () => void;   // undefined for first card (can't delete if only 1)
  errors: Partial<Record<keyof CropRecordDraft, string>>;
}
```

Internal behaviour:
- Selecting a Crop resets Variety to `''`
- Varieties dropdown is disabled until Crop is selected
- "Other" checkbox toggles visibility of `other_problem_detail` text input
- Delete button (🗑) shown only when `onDelete` is provided

---

### `PhotoPicker.tsx`

Props:
```typescript
interface PhotoPickerProps {
  photos: PhotoDraft[];
  onAdd: (photo: PhotoDraft) => void;
  onRemove: (uri: string) => void;
  minPhotos?: number;  // default: 2
  error?: string;
}
```

Behaviour:
- Tapping a thumbnail shows full-screen preview
- Tapping "+" opens action sheet: "Take Photo" / "Choose from Gallery"
- Uses `react-native-image-picker` (already available or to be added)
- Photos displayed as horizontal scroll of square thumbnails with ✕ overlay button

---

### `LocationCapture.tsx`

Props:
```typescript
interface LocationCaptureProps {
  location: LocationDraft;
  onCapture: (loc: LocationDraft) => void;
  error?: string;
}
```

Behaviour:
- On mount: calls `Geolocation.getCurrentPosition()`
- Shows spinner while fetching
- On success: displays "22.5937° N, 76.9124° E"
- Shows refresh icon button to re-capture
- On failure: shows error message + retry button
- Requires `ACCESS_FINE_LOCATION` Android permission (request on mount)

---

### `ConditionSelector.tsx`

Props:
```typescript
interface ConditionSelectorProps {
  value: CropCondition | '';
  onChange: (v: CropCondition) => void;
  error?: string;
}
```

Renders three pill buttons: Good (green) / Average (yellow) / Poor (red). Selected state uses filled background.

---

### `ProblemCheckboxGroup.tsx`

Props:
```typescript
interface ProblemCheckboxGroupProps {
  selected: ProblemType[];
  onChange: (selected: ProblemType[]) => void;
  otherDetail: string;
  onOtherDetailChange: (text: string) => void;
  error?: string;
}
```

Renders 6 checkboxes in a 3-column grid. "Other Problem" text input appears below the grid only when `other` is in `selected`.

---

## 8. Step-by-Step Implementation Order

### Phase A — Backend Foundation (do first)
1. Create `FarmerVisit`, `CropRecord`, `CropPhoto` models + migrations
2. Create `CropMaster`, `CropVariety` models + migrations
3. Seed initial crop/variety data via `seed_crop_master` management command
4. Create `District`, `Block` master models (or use simple CharField with fixed lists initially)
5. Write serializers for all new models
6. Wire up all API endpoints with DRF ViewSets
7. Register models in Django admin
8. Test all endpoints with Postman / curl

### Phase B — Mobile Types & API Layer
1. Create `src/types/cropMonitoring.ts`
2. Create `src/api/cropMonitoring.ts` with all fetch functions
3. Update `src/navigation/types.ts` with new screens

### Phase C — Atomic Components
1. `ConditionSelector.tsx`
2. `ProblemCheckboxGroup.tsx`
3. `CropCard.tsx`
4. `PhotoPicker.tsx` (+ install `react-native-image-picker` if needed)
5. `LocationCapture.tsx` (+ request Android permission)

### Phase D — Form Hook
1. Write `useCropMonitoringForm.ts` with reducer + all actions
2. Write unit-testable validation functions for each step

### Phase E — Screen Assembly
1. `CropMonitoringFormScreen.tsx` (wizard shell — renders Step1/2/3 based on step state)
2. `Step1_FarmerDetails.tsx`
3. `Step2_CropDetails.tsx` (dynamic crop card list + Add/Remove logic)
4. `Step3_PhotosLocation.tsx`
5. `ReviewScreen.tsx` (read-only summary + EDIT navigation back to correct step)
6. `SuccessScreen.tsx`

### Phase F — Dashboard Integration
1. Update `HomeScreen.tsx` to call `getVisitSummary()` and `getFarmerVisits()`
2. Update Recent Entries list to show farmer visits (not old crop entries)
3. Wire entry tap → detail screen

### Phase G — Polish & Edge Cases
1. Handle GPS permission denied gracefully
2. Handle photo permission denied gracefully
3. Add loading states to all API calls
4. Add error states / retry buttons
5. Handle network failure on submit (show error, don't navigate away)
6. Add `KeyboardAvoidingView` on all scrollable forms
7. Test on OnePlus 11R (physical device)

---

## 9. Data Flow Diagram

```
User fills Step 1
       ↓
useCropMonitoringForm reducer holds farmerDetails
       ↓
User fills Step 2 (adds 1-N crops)
       ↓
reducer holds crops[] array
       ↓
User completes Step 3 (photos + GPS + remark)
       ↓
reducer holds photos[], location, remark
       ↓
ReviewScreen displays all state (read-only)
       ↓
User taps "SUBMIT ENTRY"
       ↓
cropMonitoring.ts: submitFarmerVisit()
  → builds FormData object
  → appends farmer fields
  → appends crops as JSON string
  → appends each photo file
  → POST /api/farmer-visits/
       ↓
On 201 Created → navigate to SuccessScreen
On error → show error toast, stay on ReviewScreen
```

---

## 10. Permissions Required (Android)

Add to `android/app/src/main/AndroidManifest.xml`:
```xml
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.READ_MEDIA_IMAGES" />
<!-- For Android < 13: -->
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
```

Use `PermissionsAndroid.request()` in `LocationCapture.tsx` and `PhotoPicker.tsx` before accessing the respective hardware.

---

## 11. New npm Packages to Install

| Package | Purpose | Install Command |
|---|---|---|
| `react-native-image-picker` | Camera + gallery picker | `npm install react-native-image-picker` |
| `@react-native-community/geolocation` | GPS location | `npm install @react-native-community/geolocation` |
| `@react-native-community/datetimepicker` | Date of Sowing picker | `npm install @react-native-community/datetimepicker` |

> **Note:** All three packages require native code — rebuild after install: `npm run android:phone`

---

## 12. Master Data Seeding (Crop List)

Seed the following crops and varieties as a starting point (extend via Django admin):

| Crop | Varieties |
|---|---|
| Chilli | Teja, LCA 305, G4, Byadgi |
| Soybean | JS 9560, JS 335, NRC 86 |
| Pigeon Pea (Tur) | ICPL 87119, Maruti, Asha |
| Cotton | Bunny BT, RCH 2, MRC 7017 |
| Wheat | GW 322, Raj 4120, HI 8498 |
| Onion | Bhima Kiran, Bhima Super, Agrifound |
| Maize | NK 6240, DKC 9144, Bisco 855 |
| Tomato | Arka Rakshak, Abhinav, NS 585 |

---

## 13. Key Design Decisions

| Decision | Rationale |
|---|---|
| Wizard state lives in `useCropMonitoringForm` hook, not screen-level state | Allows Review screen and Edit navigation without losing data |
| `CropRecordDraft.localKey` is a UUID generated client-side | Needed to identify which crop card to update/delete in the `crops[]` array |
| Crops sent as JSON string in FormData | Multipart requests can't send nested JSON natively; standard workaround |
| GPS auto-captured on Step 3 mount | One location per visit, not per photo |
| Minimum 2 photos enforced client-side | Prevents incomplete field data before it hits the server |
| `FarmerVisit` separate from old `CropEntry` | Avoids breaking existing data; the two modules will coexist until migration |

---

## 14. Testing Checklist

- [ ] Step 1: All validations fire correctly on NEXT
- [ ] Step 2: "Add Another Crop" adds a new blank card and scrolls to it
- [ ] Step 2: Delete button removes correct crop card
- [ ] Step 2: First card cannot be deleted (no delete button shown)
- [ ] Step 2: Selecting a crop clears variety dropdown
- [ ] Step 2: "Other" checkbox shows text input
- [ ] Step 3: GPS captured correctly on screen mount
- [ ] Step 3: Less than 2 photos blocks SUBMIT
- [ ] Step 3: Photos can be removed from picker
- [ ] Review: "EDIT" on Farmer Details goes back to Step 1 with data intact
- [ ] Review: "EDIT" on Crops goes back to Step 2 with data intact
- [ ] Submit: API call fires with correct multipart payload
- [ ] Submit: Network error shows toast, stays on Review screen
- [ ] Submit: 201 response navigates to Success screen
- [ ] Success: "ADD NEW ENTRY" resets wizard completely
- [ ] Success: "GO TO DASHBOARD" shows new entry in Recent Entries
- [ ] Dashboard: Counts update after new submission
- [ ] Permissions: GPS denial shows graceful error
- [ ] Permissions: Camera denial shows graceful error

---

## 15. Out of Scope for This Module (Future)

- Offline-first / WatermelonDB sync → Phase 3
- Photo geo-tagging per individual photo → Phase 4
- Map view of visit location → Phase 4
- Edit a submitted entry after success → Phase 4
- Farmer search / autocomplete from existing farmers → Phase 4
- Export / Reports using visit data → Phase 4
