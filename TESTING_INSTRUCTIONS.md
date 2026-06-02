# Testing Instructions - Crop Monitoring Crash Fix

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
npm start -- --port 8081 --reset-cache
```

### 3. Deploy to Device
```bash
# In a new terminal
cd "/media/kushagra/crucial/FPS internship/fps/mobile/FarmProsperity"
adb reverse tcp:8000 tcp:8000
adb reverse tcp:8081 tcp:8081
npm run android:phone
```

### 4. Monitor Logs
```bash
# In a new terminal
npx react-native log-android | grep -E "\[CropCard\]|\[Step2\]"
```

---

## Critical Test Case (The Main Bug)

**This is the exact scenario that was crashing before:**

1. Open app → Login (admin/admin123)
2. Tap "New Visit" from home screen
3. Fill Step 1 (Farmer Details) → Tap NEXT
4. In Step 2 (Crop Details):
   - Select Crop: any crop
   - Select Variety: any variety
   - **Tap "Date of Sowing" to open the date picker**
   - Select any past date
   - Fill Current Area: 5
   - Fill This Year Area: 5
   - Select Crop Stage: any stage
   - Select Crop Condition: any condition
   - Select at least one Problem
5. **While the date picker is still visible OR immediately after closing it:**
   - **Tap NEXT button**
6. **Expected Result:** 
   - Button shows "VALIDATING..." briefly
   - App navigates to Step 3 smoothly
   - **NO CRASH** ✅
7. **Previous Result:**
   - App crashed with "FarmProsperityApp keeps stopping"

---

## Additional Test Cases

### Test 1: Date Picker Dismiss
1. In Step 2, tap "Date of Sowing"
2. Press device BACK button (dismiss without selecting)
3. **Expected:** Date field remains empty
4. **Bug if:** Date field shows today's date

### Test 2: Double-Tap Prevention
1. Fill all Step 2 fields correctly
2. Rapidly tap NEXT button twice
3. **Expected:** 
   - Button shows "VALIDATING..."
   - Only one validation runs
   - Logs show "Already validating — ignoring duplicate tap"
4. **Bug if:** Multiple alerts appear or app freezes

### Test 3: Validation Errors
1. In Step 2, leave some fields empty
2. Tap NEXT
3. **Expected:**
   - Validation errors appear inline
   - Alert shows "Fix Errors"
   - App does NOT crash
4. **Bug if:** App crashes or freezes

### Test 4: Multiple Crops
1. Fill first crop card completely
2. Tap "ADD ANOTHER CROP"
3. Fill second crop card
4. Open date picker on second crop
5. Tap NEXT while picker is open
6. **Expected:** Navigates to Step 3 without crash
7. **Bug if:** App crashes

### Test 5: Full Workflow
1. Complete Step 1 → NEXT
2. Complete Step 2 → NEXT
3. In Step 3:
   - Take 2 photos
   - Capture GPS location
   - Add optional remark
   - Tap SUBMIT
4. Review screen → Tap SUBMIT
5. **Expected:** Success screen appears
6. **Bug if:** Crash at any step

---

## Expected Log Output

### Successful Navigation (Happy Path)
```
[Step2] handleNext called. Crop count: 1
[Step2] Validation complete. Error count: 0
[Step2] Validation passed → advancing to Step 3.
```

### Validation Failure
```
[Step2] handleNext called. Crop count: 1
[Step2] Validation complete. Error count: 3
[Step2] Validation failed. Showing error alert.
```

### Date Picker Dismissed
```
[CropCard] DatePicker dismissed — no state update.
```

### Date Selected
```
[CropCard] Date selected: 2024-05-15
```

### Double-Tap Prevented
```
[Step2] handleNext called. Crop count: 1
[Step2] Already validating — ignoring duplicate tap.
```

---

## If Crash Still Occurs

### 1. Collect Full Crash Log
```bash
adb logcat -d > crash_log.txt
```

Look for lines containing:
- `FATAL EXCEPTION`
- `AndroidRuntime`
- `ReactNative`
- `DateTimePicker`
- `JNI`

### 2. Check Specific Errors
```bash
adb logcat -d | grep -E "FATAL|AndroidRuntime" | tail -50
```

### 3. Check React Native Errors
```bash
npx react-native log-android | grep -E "ERROR|FATAL"
```

### 4. Report Back
Include:
- Exact steps to reproduce
- Full crash log from step 1
- Device model and Android version
- Whether it crashes every time or intermittently

---

## Success Criteria

✅ **Fix is successful if:**
1. Can complete Step 2 → Step 3 transition without crash
2. Can do this with date picker open
3. Can do this multiple times in a row
4. Can complete full workflow end-to-end
5. All validation still works correctly

❌ **Fix needs more work if:**
1. Crash still occurs (even intermittently)
2. Date picker behaves incorrectly
3. Validation stops working
4. New bugs appear

---

## Rollback Plan

If the fix causes new issues:

```bash
cd "/media/kushagra/crucial/FPS internship/fps/mobile/FarmProsperity"

# See what changed
git diff src/screens/cropMonitoring/Step2_CropDetails.tsx
git diff src/components/CropCard.tsx

# Revert changes
git checkout src/screens/cropMonitoring/Step2_CropDetails.tsx
git checkout src/components/CropCard.tsx

# Restart Metro
npm start -- --port 8081 --reset-cache
```

---

## Technical Details

### What Was Fixed

1. **Timing Issue:** Added 150ms delay before navigation to let native picker close
2. **Race Conditions:** Added `isValidating` flag to prevent double-tap
3. **Picker Cleanup:** Force-close picker when validation errors appear
4. **Platform Isolation:** Split DateTimePicker rendering by platform
5. **Ref Tracking:** Use ref to track picker state at unmount time

### Why These Fixes Work

- **150ms delay:** Gives Android time to clean up native DateTimePicker module
- **isValidating flag:** Prevents concurrent validation attempts
- **Force-close on errors:** Ensures picker is never open during re-validation
- **Platform split:** Helps React Native reconciler manage native modules better
- **Ref tracking:** Captures actual state at unmount (not stale closure)

### Files Changed

- `src/screens/cropMonitoring/Step2_CropDetails.tsx`
- `src/components/CropCard.tsx`

### No Changes To

- Validation logic (still works the same)
- Form state management (still uses useReducer)
- API calls (unchanged)
- Other steps (Step 1, Step 3, Review)
- Native code (no rebuild needed)
