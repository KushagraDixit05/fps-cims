# Farm Prosperity Solution (FPS) — Setup Guide

A step-by-step guide for a **first-time user** to get the project running from scratch.

> **Estimated time:** ~20 minutes (excluding dependency download time)

---

## Prerequisites

Install the following tools before starting. Skip anything you already have.

| Tool | Why | Install |
|---|---|---|
| **Docker Desktop** | Runs the PostgreSQL + PostGIS database | [docker.com/get-started](https://www.docker.com/get-started/) |
| **Python 3.10+** | Django backend | [python.org/downloads](https://www.python.org/downloads/) |
| **Node.js 18+** | React Native metro bundler | [nodejs.org](https://nodejs.org/) |
| **Android Studio** | Android SDK, emulator, build tools | [developer.android.com/studio](https://developer.android.com/studio) |
| **JDK 17** | Gradle build system | Bundled with Android Studio |
| **ADB** | USB device communication | Bundled with Android Studio SDK Platform Tools |

> **Tip:** After installing Android Studio, open SDK Manager and install:
> - Android SDK Platform 34 (API 34)
> - Android SDK Build-Tools 34
> - NDK (Side by side)
> - Android Emulator

---

## Step 1 — Clone the Repository

```bash
git clone https://github.com/KushagraDixit05/fps-cims.git fps
cd fps
```

---

## Step 2 — Backend Setup

### 2.1 — Create the environment file

Inside the `backend/` folder, create a file named `.env`:

```bash
# Create this file at: fps/backend/.env
DB_NAME=fps_db
DB_USER=fps_user
DB_PASSWORD=kushagra123
DB_HOST=localhost
DB_PORT=5432
SECRET_KEY=super-secret-key-change-this-in-production
DEBUG=True
```

### 2.2 — Start the database (Docker)

Make sure Docker Desktop is **open and running** first.

```bash
cd fps/backend
docker compose up -d
```

Verify it started:
```bash
docker ps
# You should see a container named "backend-db-1" (or similar) running
```

### 2.3 — Set up Python virtual environment

```bash
# Inside fps/backend/
python3 -m venv venv
source venv/bin/activate       # On Windows: venv\Scripts\activate

pip install -r requirements.txt
```

> **If `requirements.txt` is missing**, install manually:
> ```bash
> pip install django djangorestframework djangorestframework-simplejwt \
>   psycopg2-binary django-cors-headers django-filter \
>   pillow python-dotenv
> ```

### 2.4 — Apply database migrations

```bash
# Still inside fps/backend/ with venv activated
python manage.py migrate
```

### 2.5 — Seed initial data

```bash
# Create an admin user
python manage.py createsuperuser
# When prompted:
#   Username:  admin
#   Password:  admin123   (or anything you choose)

# Seed crop master data (crops, varieties, districts, blocks)
python manage.py seed_crop_master
```

### 2.6 — Start the backend server

```bash
python manage.py runserver 0.0.0.0:8000
```

✅ **Backend is running** at `http://localhost:8000`  
✅ Django Admin at `http://localhost:8000/admin`

---

## Step 3 — Mobile App Setup

### 3.1 — Install Node dependencies

```bash
cd fps/mobile/FarmProsperity
npm install
```

### 3.2 — Configure the API URL

Open `fps/mobile/FarmProsperity/src/api/client.ts`.

The app automatically detects the correct URL:
- **Android Emulator** → uses `http://10.0.2.2:8000/api` (emulator's alias for your machine)
- **Physical device (USB)** → uses `http://localhost:8000/api` via ADB port forwarding

> If connecting over **Wi-Fi** instead of USB, find line ~23 in `client.ts` and set:
> ```ts
> const MANUAL_IP = '192.168.x.x';  // ← your computer's local network IP
> ```

### 3.3 — Run on Android Emulator

1. Open Android Studio → **Device Manager** → Start a virtual device (e.g. Pixel 8, API 34)
2. Wait for emulator to fully boot
3. Then run:

```bash
cd fps/mobile/FarmProsperity
npm run android:emulator
```

### 3.4 — Run on a Physical Android Device (USB)

1. On your Android phone: **Settings → Developer Options → Enable USB Debugging**
2. Connect phone to computer via USB cable
3. Run these commands:

```bash
# Forward API and bundler ports through USB
adb reverse tcp:8000 tcp:8000
adb reverse tcp:8081 tcp:8081

# Build and install the app
cd fps/mobile/FarmProsperity
npm run android:phone
```

> **First build takes 3–8 minutes** (Gradle downloads dependencies). Subsequent builds are much faster.

---

## Step 4 — Verify Everything Works

1. Open the app on your device/emulator
2. Log in with:
   - **Username:** `admin`
   - **Password:** `admin123` (or whatever you set in Step 2.5)
3. You should see the **Home Dashboard** with a visit summary strip and quick action cards
4. Tap **"New Visit"** → The 3-step Crop Monitoring Wizard should open

---

## Everyday Development Workflow

Once set up, starting the project each day only takes one command! We have provided a startup script that automatically launches the database, backend server, and Metro bundler in separate terminal windows.

```bash
# Run this from the root 'fps' folder
./start.sh
```

*(If permission is denied, run `chmod +x start.sh` first).*

### Launch the App

After running the script, just open a new terminal tab and launch the app:

```bash
# For physical device (USB)
cd fps/mobile/FarmProsperity
npm run android:phone

# OR for emulator
npm run android:emulator
```

---

## Troubleshooting

### ❌ "Connection refused" when starting the backend
**Cause:** Docker database is not running.
**Fix:** Open Docker Desktop, wait for it to start, then run `docker compose up -d` again.

### ❌ "INSTALL_FAILED_NO_MATCHING_ABIS" on Android
**Cause:** Wrong CPU architecture build cached.
**Fix:**
```bash
cd fps/mobile/FarmProsperity/android
./gradlew clean
cd ..
npm run android:phone   # for device
# or
npm run android:emulator  # for emulator
```

### ❌ App shows "Network Error" on physical device
**Cause:** The device can't reach `localhost:8000` without ADB forwarding.
**Fix:** Run `adb reverse tcp:8000 tcp:8000` before launching the app. Make sure the backend is running on `0.0.0.0:8000` (not `127.0.0.1:8000`).

### ❌ Camera or GPS not working on device
**Cause:** Runtime permissions were not granted.
**Fix:** Go to **Android Settings → Apps → FarmProsperity → Permissions** and grant Camera and Location.

### ❌ Metro bundler not connecting to device
**Fix:** Run `adb reverse tcp:8081 tcp:8081` and then reload the app (shake device → Reload).

---

## Useful URLs (with backend running)

| URL | Description |
|---|---|
| `http://localhost:8000/admin` | Django Admin panel |
| `http://localhost:8000/api/districts/` | Test API — district list |
| `http://localhost:8000/api/crop-master/` | Test API — crops and varieties |
| `http://localhost:8000/api/farmer-visits/` | Test API — visit list |
| `http://localhost:8000/api/farmer-visits/summary/` | Test API — dashboard counts |
