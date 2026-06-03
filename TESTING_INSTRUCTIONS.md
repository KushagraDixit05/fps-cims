# Farm Prosperity Solutions (FPS) — Testing Instructions

> **Current scope:** Offline-First Sync (Phase 3)  
> **Status:** Phase 3 implemented and verified on physical device.

---

## Quick Start

### 1. Start Backend
```bash
cd "/media/kushagra/crucial/FPS internship/fps/backend"
docker compose up -d
source venv/bin/activate
python manage.py runserver 0.0.0.0:8000
```

### 2. Start Metro Bundler
```bash
cd "/media/kushagra/crucial/FPS internship/fps/mobile/FarmProsperity"
npm start
```

### 3. Deploy to Device
```bash
# In a new terminal
cd "/media/kushagra/crucial/FPS internship/fps/mobile/FarmProsperity"
adb reverse tcp:8000 tcp:8000
adb reverse tcp:8081 tcp:8081
npm run android:phone
```

### 4. Monitor Sync Logs
```bash
npx react-native log-android | grep -E "\[FPS Sync\]"
```

---

## Test Suite — Offline Sync

### Test 1: Offline Record Creation (Critical)

**Preconditions:** Device has internet. App is open and logged in.

1. Turn off Wi-Fi and mobile data on the device.
2. Open the app — it should still load normally.
3. Tap **"New Visit"** → complete the 3-step Crop Monitoring wizard → tap **Submit**.
4. You should see the **Success screen** immediately (no network request is made).
5. Navigate to **Profile** tab.

**Expected Profile screen:**
```
Sync Status
Visits: 1   Crop Entries: 0   Mandi: 0
1 record pending sync
● Offline
[Sync Now]
```

**Bug if:** App errors, freezes, or shows "0 records pending".

---

### Test 2: Sync Now While Offline

**Preconditions:** At least 1 pending record exists (from Test 1). Device is **offline**.

1. On Profile screen, tap **Sync Now**.

**Expected alert:**
```
No Internet Connection
1 record pending. They will sync automatically when you go online.
```

**Bug if:** Alert shows "No pending records to sync." (this was the Phase 3 bug — now fixed).

---

### Test 3: Auto-Sync on Reconnect

**Preconditions:** Pending records exist. Device is offline.

1. Re-enable Wi-Fi or mobile data.
2. Within ~5 seconds, watch the log output.

**Expected logs:**
```
[FPS Sync] ✅ Synced 1 record(s) to backend.
```

3. Navigate to **Profile** tab.

**Expected Profile screen:**
```
Visits: 0   Crop Entries: 0   Mandi: 0
● Online
Last synced: Today, 3:45 PM
```

**Expected Django Admin:**
- Open `http://localhost:8000/admin` → **Farmer Visits**
- The new visit record should appear.

**Bug if:** Pending count does not drop, or record is absent from Django Admin.

---

### Test 4: Manual Sync While Online

**Preconditions:** At least 1 pending record exists. Device is **online**.

1. On Profile screen, tap **Sync Now**.

**Expected alert (if records synced):**
```
Sync Complete
1 record(s) synced successfully.
```

**Expected alert (if nothing was pending):**
```
Up to date
No pending records to sync.
```

**Bug if:** Alert says "No pending records" when the pending count badge shows > 0.

---

### Test 5: Multiple Records — All Three Types

1. Go offline.
2. Submit **1 Crop Monitoring visit**.
3. Submit **1 Legacy Crop Entry** (from the Crop List screen).
4. Submit **1 Mandi Arrival** (from the Mandi screen).
5. Navigate to Profile.

**Expected:**
```
Visits: 1   Crop Entries: 1   Mandi: 1
3 records pending sync
```

6. Go online.
7. Auto-sync should trigger.

**Expected after sync:**
```
Visits: 0   Crop Entries: 0   Mandi: 0
Last synced: Today, HH:MM
```

**Django Admin should show** all 3 new records.

---

### Test 6: Reference Data Available Offline

1. Go offline before opening the app (or kill app, disable internet, reopen).
2. Tap **"New Visit"** → **Step 1**.

**Expected:** District and Block dropdowns still populate from locally cached data.

**Bug if:** Dropdowns are empty when offline.

---

### Test 7: Full End-to-End Workflow

1. Go offline.
2. Create **2 Crop Monitoring visits** (different farmer names).
3. Profile shows `2 records pending sync`.
4. Tap **Sync Now** → "No Internet Connection — 2 records pending."
5. Go online.
6. Auto-sync fires.
7. Profile shows `0 records pending`.
8. Django Admin → Farmer Visits shows the 2 new records.

✅ This is the complete verified workflow.

---

## Expected Log Output

### Auto-sync fires successfully
```
[FPS Sync] ✅ Synced 2 record(s) to backend.
```

### Auto-sync — nothing to sync
```
(no output — sync runs silently when result.synced === 0)
```

### Auto-sync — failure
```
[FPS Sync] ⚠️ 1 record(s) failed to sync.
```

---

## Debugging

### Watch all sync activity
```bash
npx react-native log-android | grep -E "\[FPS Sync\]"
```

### Check WatermelonDB queries (verbose)
```bash
npx react-native log-android | grep -E "watermelon|sqlite"
```

### View full device logs
```bash
adb logcat -d > device_log.txt
```

---

## Django Admin Verification

| URL | What to check |
|---|---|
| `http://localhost:8000/admin/crops/farmervisit/` | New visit records appear after sync |
| `http://localhost:8000/admin/crops/cropentry/` | Legacy crop entries appear after sync |
| `http://localhost:8000/admin/mandi/mandiarrival/` | Mandi arrivals appear after sync |

---

## Rollback

If a sync change causes issues, revert the three relevant files:

```bash
cd "/media/kushagra/crucial/FPS internship/fps/mobile/FarmProsperity"
git diff src/sync/syncService.ts
git diff src/sync/syncTypes.ts
git diff src/screens/ProfileScreen.tsx
git checkout src/sync/syncService.ts src/sync/syncTypes.ts src/screens/ProfileScreen.tsx
npm start -- --reset-cache
```

---

## Known Bugs — Fixed

| Bug | Fix Applied |
|---|---|
| **Sync Now shows "No pending records" while offline** | `syncPendingRecords()` now sets `result.offline = true`; `handleManualSync()` checks this flag before interpreting counts |
| **Step 2 → Step 3 crash on Android (DateTimePicker)** | `isValidDate()` guard, dismiss event guard, 150ms navigation delay, double-tap prevention |

---

## Success Criteria — Phase 3

✅ Fix is complete if ALL of the following hold:

1. Creating a visit while offline saves it locally (instant, no error)
2. Profile screen shows the correct pending count immediately after saving
3. Tapping **Sync Now** while offline shows the pending count, not "No records"
4. Going online triggers auto-sync within ~5 seconds
5. After auto-sync, pending count drops to 0
6. Synced records appear in Django Admin
7. All three record types (Farmer Visits, Crop Entries, Mandi Arrivals) sync correctly
