# Farm Prosperity Solutions (FPS) — Testing Instructions

> **Current scope:** All modules (Crop Monitoring, Mandi Arrival, Product Demo) + Offline Sync
> **Backend:** Live at `https://fps-cims-backend.onrender.com`
> **APK:** Release build — connects to cloud backend via `__DEV__` flag

---

## Before Testing

### Wake the backend
Render free tier sleeps after 15 min of inactivity. First request after sleep takes ~30 sec.

Open this URL in a browser and wait for the JSON response:
```
https://fps-cims-backend.onrender.com/api/auth/login/
```
You'll see `{"detail": "Method \"GET\" not allowed."}` — that means the backend is awake.

### Install the APK
```bash
adb install -r "mobile/FarmProsperity/android/app/build/outputs/apk/release/app-release.apk"
```
If signature conflict: `adb uninstall com.farmprosperity` first.

---

## Quick Start (Local Dev Backend)

### 1. Start Backend
```bash
cd backend
docker compose up -d
source venv/bin/activate
python manage.py runserver 0.0.0.0:8000
```

### 2. Start Metro Bundler
```bash
cd mobile/FarmProsperity
npm start
```

### 3. Deploy Dev Build to Device
```bash
adb reverse tcp:8000 tcp:8000
adb reverse tcp:8081 tcp:8081
npm run android:phone
```

### 4. Monitor Logs
```bash
npx react-native log-android | grep -E "\[FPS Sync\]"
```

---

## Test Suite — Offline Sync

### Test 1: Offline Record Creation

1. Turn off Wi-Fi and mobile data.
2. Open app — should load normally.
3. Tap **New Visit** → complete Crop Monitoring wizard → Submit.
4. Success screen appears immediately (saved locally, no network needed).
5. Navigate to **Profile** tab.

**Expected:**
```
Visits: 1   Crop Entries: 0   Mandi: 0
1 record pending sync
● Offline
[Sync Now]
```

---

### Test 2: Sync Now While Offline

**Precondition:** At least 1 pending record. Device offline.

1. Tap **Sync Now** on Profile screen.

**Expected alert:**
```
No Internet Connection
1 record pending. They will sync automatically when you go online.
```

---

### Test 3: Auto-Sync on Reconnect

**Precondition:** Pending records exist. Device offline.

1. Re-enable Wi-Fi or mobile data.
2. Within ~5 seconds, sync fires automatically.

**Expected logs:**
```
[FPS Sync] ✅ Synced 1 record(s) to backend.
```

**Expected Profile:**
```
Visits: 0   Crop Entries: 0   Mandi: 0
● Online
Last synced: Today, HH:MM
```

**Verify in Django Admin:**
- Local: `http://localhost:8000/admin/crops/farmervisit/`
- Cloud: `https://fps-cims-backend.onrender.com/admin/crops/farmervisit/`

---

### Test 4: Manual Sync While Online

**Precondition:** Pending records. Device online.

1. Tap **Sync Now**.

**Expected (records synced):**
```
Sync Complete — 1 record(s) synced successfully.
```

**Expected (nothing pending):**
```
Up to date — No pending records to sync.
```

---

### Test 5: All Three Record Types

1. Go offline.
2. Submit 1 **Crop Monitoring visit**.
3. Submit 1 **Mandi Arrival**.
4. Submit 1 **Product Demo**.
5. Profile shows: `Visits: 1  Mandi: 1  (+ product_demos pending)`
6. Go online → auto-sync fires → counts drop to 0.

**Django Admin verification:**

| URL | Records |
|---|---|
| `/admin/crops/farmervisit/` | Crop Monitoring visits |
| `/admin/mandi/mandiarrival/` | Mandi arrivals |
| `/admin/product_demo/productdemo/` | Product demos |

---

### Test 6: Reference Data Available Offline

1. Go offline.
2. Tap **New Visit** → Step 1.

**Expected:** District and Block dropdowns still populate (seeded from cloud on first login).

---

## Django Admin Verification

| URL (Cloud) | What to check |
|---|---|
| `https://fps-cims-backend.onrender.com/admin/crops/farmervisit/` | Crop Monitoring submissions |
| `https://fps-cims-backend.onrender.com/admin/mandi/mandiarrival/` | Mandi arrivals |
| `https://fps-cims-backend.onrender.com/admin/product_demo/productdemo/` | Product demo submissions |
| `https://fps-cims-backend.onrender.com/admin/crops/cropmaster/` | Seeded crops (8 crops) |
| `https://fps-cims-backend.onrender.com/admin/product_demo/productmaster/` | Seeded products (20) |

---

## Debugging

### Watch sync activity
```bash
npx react-native log-android | grep -E "\[FPS Sync\]"
```

### Full device logs
```bash
adb logcat -d > device_log.txt
```

### Test API directly (cloud)
```bash
curl -X POST https://fps-cims-backend.onrender.com/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "your-password"}'
```

---

## Known Bugs — Fixed

| Bug | Fix Applied |
|---|---|
| Sync Now shows "No pending records" while offline | `syncPendingRecords()` sets `result.offline = true`; caller checks flag before interpreting counts |
| Step 2→3 crash on Android (DateTimePicker, OxygenOS) | `isValidDate()` guard, dismiss event guard, 150ms navigation delay, double-tap prevention |
| Release APK "can't reach server" | Axios timeout raised to 60s to handle Render cold start (~30s) |
| "Package conflict" installing release APK | Old debug build has different signature — uninstall via `adb uninstall com.farmprosperity` first |
