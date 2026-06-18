# Farm Prosperity Solutions (FPS) — Setup Guide

---

## Two Ways to Run the Backend

| Mode | When to use |
|---|---|
| **Cloud (Render)** | Testing the release APK, sharing with testers |
| **Local (Docker)** | Active development — code changes, debugging |

The release APK always hits the cloud backend (`__DEV__ === false`). Your local dev runs (`npm run android:phone`) always hit localhost.

---

## A — Install the Release APK (Testers)

No backend setup needed. The APK connects to the live Render backend.

1. Copy `android/app/build/outputs/apk/release/app-release.apk` to the tester's phone
2. On the phone: **Settings → Install unknown apps** → allow the file manager
3. Open the APK file and install

**If "package conflict" error:** The old debug build is still on the phone. Run:
```bash
adb uninstall com.farmprosperity
```
Then install via ADB:
```bash
adb install "/path/to/app-release.apk"
```

**Wake the backend first:** Render free tier sleeps after 15 min. Before testing, open this in a browser and wait for a response (~30 sec):
```
https://fps-cims-backend.onrender.com/api/auth/login/
```

---

## B — Local Development Setup

### Prerequisites

| Tool | Why | Install |
|---|---|---|
| **Docker Desktop** | Runs the local PostgreSQL + PostGIS database | [docker.com](https://www.docker.com/get-started/) |
| **Python 3.12** | Django backend | [python.org](https://www.python.org/downloads/) |
| **Node.js 18+** | React Native metro bundler | [nodejs.org](https://nodejs.org/) |
| **Android Studio** | Android SDK, emulator, build tools | [developer.android.com/studio](https://developer.android.com/studio) |
| **JDK 17** | Gradle build system | Bundled with Android Studio |

> After installing Android Studio, open SDK Manager and install: Android SDK Platform 34, Build-Tools 34, NDK (Side by side), Android Emulator.

---

### Step 1 — Clone the Repository

```bash
git clone https://github.com/KushagraDixit05/fps-cims.git fps
cd fps
```

---

### Step 2 — Backend Setup

#### 2.1 — Create `.env`

Copy `backend/.env.example` to `backend/.env` and fill in values:

```bash
cp backend/.env.example backend/.env
```

```env
SECRET_KEY=any-long-random-string-for-local-dev
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1,10.0.2.2
DB_NAME=fps_db
DB_USER=fps_user
DB_PASSWORD=kushagra123
DB_HOST=localhost
DB_PORT=5432
```

#### 2.2 — Start the database

```bash
cd backend
docker compose up -d
```

#### 2.3 — Set up Python virtual environment

```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

#### 2.4 — Run migrations and seed data

```bash
python manage.py migrate
python manage.py createsuperuser
python manage.py seed_crop_master
python manage.py seed_product_master
```

#### 2.5 — Start the backend

```bash
python manage.py runserver 0.0.0.0:8000
```

✅ Backend running at `http://localhost:8000`
✅ Admin panel at `http://localhost:8000/admin`

---

### Step 3 — Mobile App Setup

#### 3.1 — Install dependencies

```bash
cd mobile/FarmProsperity
npm install
```

#### 3.2 — Run on physical device (USB)

```bash
# Forward ports through USB
adb reverse tcp:8000 tcp:8000
adb reverse tcp:8081 tcp:8081

# Build and install (dev build hits localhost via adb reverse)
npm run android:phone
```

#### 3.3 — Run on emulator

```bash
npm run android:emulator
```

---

## C — Build the Release APK

The release APK hits the live Render backend (controlled by `__DEV__` flag in `client.ts`).

**Requirement:** `android/keystore.properties` must exist locally (gitignored, kept separately — ask the project owner for the credentials file if missing).

```bash
cd mobile/FarmProsperity/android
./gradlew assembleRelease
```

APK output: `app/build/outputs/apk/release/app-release.apk`

Install via ADB:
```bash
adb install -r "/path/to/app-release.apk"
```

---

## D — Cloud Backend Reference

| Item | Value |
|---|---|
| Live API | `https://fps-cims-backend.onrender.com/api` |
| Django Admin | `https://fps-cims-backend.onrender.com/admin` |
| Wake URL | `https://fps-cims-backend.onrender.com/api/auth/login/` |
| Superuser | Set via `DJANGO_SUPERUSER_*` env vars on Render |
| Deploy config | `render.yaml` (Docker Blueprint) + `backend/Dockerfile` |

**Auto-deploy:** Every push to `main` triggers a Render redeploy (~3–5 min). Migrations and seeds run automatically on startup.

> **Boot safety:** the container now **aborts** if `migrate` or `collectstatic` fails — gunicorn no longer starts against an un-migrated database. Check the Render deploy logs if a release doesn't come up.

### Required production environment variables (Render)

Set these in the Render dashboard (or as `render.yaml` `sync: false` secrets). The backend **fails fast at startup** if `SECRET_KEY` or `ALLOWED_HOSTS` is missing when `DEBUG` is not `True` — this is intentional, never deploy without them.

| Variable | Required | Notes |
|---|---|---|
| `SECRET_KEY` | ✅ | Long random string. Boot aborts if unset in production. |
| `ALLOWED_HOSTS` | ✅ | Comma-separated hosts, e.g. `fps-cims-backend.onrender.com`. No wildcard in production. |
| `DATABASE_URL` | ✅ | Neon Postgres URL with `?sslmode=require`. |
| `CLOUDINARY_URL` | ✅ | Durable media storage (Render disk is ephemeral). |
| `DEBUG` | ✅ | `False` in production. |
| `CORS_ALLOWED_ORIGINS` | ⬜ | Comma-separated admin-portal origins (browser clients only). |
| `CORS_ALLOWED_ORIGIN_REGEXES` | ⬜ | Optional regex origins, e.g. Vercel preview deploys. |
| `DJANGO_SUPERUSER_USERNAME` / `_PASSWORD` / `_EMAIL` | ⬜ | First-boot superuser. |

When `DEBUG=False`, HTTPS hardening turns on automatically (SSL redirect, HSTS, secure session/CSRF cookies) using the Render proxy's `X-Forwarded-Proto` header. Local `DEBUG=True` runs over plain HTTP are unaffected.

### Account roles

Public registration (`POST /api/auth/register/`) **always** creates a `field_executive` — a client-supplied `role` is ignored. Admin accounts are provisioned only via Django admin or `createsuperuser`.

---

## Quick Start (Already Set Up)

Open three terminals:

**Terminal 1 — Backend:**
```bash
cd fps/backend
source venv/bin/activate
docker compose up -d
python manage.py runserver 0.0.0.0:8000
```

**Terminal 2 — Metro:**
```bash
cd fps/mobile/FarmProsperity
npm start
```

**Terminal 3 — Device:**
```bash
adb reverse tcp:8000 tcp:8000
adb reverse tcp:8081 tcp:8081
cd fps/mobile/FarmProsperity
npm run android:phone
```

---

## Troubleshooting

### ❌ "Connection refused" on backend start
Docker is not running. Open Docker Desktop, wait for it to start, then `docker compose up -d`.

### ❌ "Can't reach server" in release APK
The Render backend is sleeping. Open `https://fps-cims-backend.onrender.com/api/auth/login/` in a browser, wait ~30 sec for a response, then try the app.

### ❌ "Package conflict" when installing APK
Old debug build still installed. Run `adb uninstall com.farmprosperity` then reinstall.

### ❌ "INSTALL_FAILED_NO_MATCHING_ABIS"
Wrong CPU architecture cached.
```bash
cd mobile/FarmProsperity/android && ./gradlew clean
npm run android:phone
```

### ❌ App shows "Network Error" on physical device (dev build)
Run `adb reverse tcp:8000 tcp:8000`. Ensure backend is on `0.0.0.0:8000` not `127.0.0.1:8000`.

### ❌ Metro not connecting to device
Run `adb reverse tcp:8081 tcp:8081`, then shake device → Reload.

### ❌ Camera or GPS not working
Settings → Apps → FarmProsperity → Permissions → grant Camera and Location.

---

## Useful URLs

| URL | Description |
|---|---|
| `http://localhost:8000/admin` | Local Django Admin |
| `https://fps-cims-backend.onrender.com/admin` | Production Django Admin |
| `http://localhost:8000/api/districts/` | Test API locally |
| `https://fps-cims-backend.onrender.com/api/districts/` | Test API in production |
