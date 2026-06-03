# Phase 0 — Foundation & Setup
**Farm Prosperity Solutions · Crop Intelligence & Monitoring System**
**Duration: Week 1–2**

---

## Goal
Get your development environment fully ready before writing a single line of product code. This phase has zero features — but skipping it causes pain in every phase after.

---

## 0.1 — What You're Building (Mental Model)

```
┌─────────────────────────────────────────────────────┐
│              FIELD EXECUTIVE (You)                  │
│         React Native App (Android + iOS)            │
│         Offline-first · WatermelonDB locally        │
└────────────────────┬────────────────────────────────┘
                     │ HTTPS API (JSON)
                     ▼
┌─────────────────────────────────────────────────────┐
│              BACKEND SERVER                         │
│         Django + Django REST Framework              │
│         Handles auth, data, sync logic              │
└────────────────────┬────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────┐
│              DATABASE                               │
│         PostgreSQL + PostGIS                        │
│         Stores all farmer, crop, mandi data         │
└─────────────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────┐
│              CLOUD (AWS / GCP)                      │
│         Hosts backend + database                    │
│         Stores photos (S3 / Cloud Storage)          │
└─────────────────────────────────────────────────────┘
```

---

## 0.2 — Machine Setup

### Install these tools on your laptop (Mac or Windows)

| Tool | What it does | Install |
|------|-------------|---------|
| **Node.js 20 LTS** | Runs React Native tooling | https://nodejs.org |
| **Python 3.11+** | Runs Django backend | https://python.org |
| **Git** | Version control | https://git-scm.com |
| **VS Code** | Code editor | https://code.visualstudio.com |
| **Android Studio** | Android emulator | https://developer.android.com/studio |
| **Xcode** (Mac only) | iOS simulator | Mac App Store |
| **Docker Desktop** | Runs PostgreSQL locally | https://docker.com |
| **Postman** | Test your APIs | https://postman.com |

### VS Code Extensions to install
```
- Python (Microsoft)
- Pylance
- React Native Tools
- ESLint
- Prettier
- GitLens
- Thunder Client (API testing, alternative to Postman)
```

---

## 0.3 — Project Folder Structure

Create this structure on your machine:

```
fps/
├── backend/          ← Django project lives here
├── mobile/           ← React Native app lives here
├── docs/             ← Your phase files (this folder)
└── README.md
```

```bash
mkdir fps && cd fps
mkdir backend mobile docs
git init
```

---

## 0.4 — Backend: Django Project Setup

### Step 1: Create Python virtual environment
```bash
cd backend
python -m venv venv

# Activate it:
# Mac/Linux:
source venv/bin/activate
# Windows:
venv\Scripts\activate
```

### Step 2: Install packages
```bash
pip install django
pip install djangorestframework
pip install django-cors-headers
pip install psycopg2-binary
pip install Pillow
pip install python-dotenv
pip install djangorestframework-simplejwt

pip freeze > requirements.txt
```

### Step 3: Create the Django project
```bash
django-admin startproject fps_backend .
```

Your backend folder now looks like:
```
backend/
├── fps_backend/
│   ├── __init__.py
│   ├── settings.py    ← main config file
│   ├── urls.py        ← URL routing
│   └── wsgi.py
├── manage.py
├── requirements.txt
└── venv/
```

### Step 4: Configure settings.py

Open `fps_backend/settings.py` and make these changes:

```python
# At the top, add:
from pathlib import Path
import os
from dotenv import load_dotenv
load_dotenv()

# INSTALLED_APPS — add these:
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'django.contrib.gis',          # PostGIS support
    'rest_framework',              # DRF
    'corsheaders',                 # CORS for mobile app
]

# MIDDLEWARE — add corsheaders at the TOP:
MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',   # ← add this first
    'django.middleware.security.SecurityMiddleware',
    # ... rest stays the same
]

# DATABASE (PostgreSQL):
DATABASES = {
    'default': {
        'ENGINE': 'django.contrib.gis.db.backends.postgis',
        'NAME': os.getenv('DB_NAME', 'fps_db'),
        'USER': os.getenv('DB_USER', 'fps_user'),
        'PASSWORD': os.getenv('DB_PASSWORD', 'password'),
        'HOST': os.getenv('DB_HOST', 'localhost'),
        'PORT': os.getenv('DB_PORT', '5432'),
    }
}

# DRF config:
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
}

# CORS — allow mobile app:
CORS_ALLOW_ALL_ORIGINS = True  # for development only
```

### Step 5: Create a .env file
```bash
# backend/.env
DB_NAME=fps_db
DB_USER=fps_user
DB_PASSWORD=yourpassword
DB_HOST=localhost
DB_PORT=5432
SECRET_KEY=your-very-long-random-secret-key-here
DEBUG=True
```

**Never commit .env to Git.** Add it to `.gitignore`.

---

## 0.5 — Database: PostgreSQL with Docker

Docker lets you run PostgreSQL without installing it directly. Create a `docker-compose.yml` in your `backend/` folder:

```yaml
version: '3.8'
services:
  db:
    image: postgis/postgis:15-3.3
    environment:
      POSTGRES_DB: fps_db
      POSTGRES_USER: fps_user
      POSTGRES_PASSWORD: yourpassword
    ports:
      - "5432:5432"
    volumes:
      - fps_postgres_data:/var/lib/postgresql/data

volumes:
  fps_postgres_data:
```

Start the database:
```bash
docker-compose up -d
```

Verify it's running:
```bash
docker-compose ps
# Should show db running on port 5432
```

---

## 0.6 — Mobile: React Native Project Setup

```bash
cd ../mobile

# Install React Native CLI
npm install -g @react-native-community/cli

# Create new project
npx react-native@latest init FarmProsperity --template react-native-template-typescript

cd FarmProsperity
```

### Install the core packages you'll need (all phases)
```bash
# Navigation
npm install @react-navigation/native @react-navigation/stack @react-navigation/bottom-tabs
npm install react-native-screens react-native-safe-area-context

# Local database (offline-first)
npm install @nozbe/watermelondb

# Camera & photos
npm install react-native-camera react-native-image-picker

# Location / geo-tagging
npm install react-native-geolocation-service
npm install react-native-maps

# HTTP requests
npm install axios

# Async storage
npm install @react-native-async-storage/async-storage

# Icons
npm install react-native-vector-icons

# Date handling
npm install dayjs

# Forms
npm install react-hook-form
```

### iOS only (Mac):
```bash
cd ios && pod install && cd ..
```

### Run on emulator:
```bash
# Android (make sure Android Studio emulator is running):
npx react-native run-android

# iOS (Mac only):
npx react-native run-ios
```

---

## 0.7 — Git Setup & Workflow

```bash
# In your fps/ root folder:
cat > .gitignore << 'EOF'
# Python
backend/venv/
backend/__pycache__/
backend/.env
backend/*.pyc

# React Native
mobile/FarmProsperity/node_modules/
mobile/FarmProsperity/.env
mobile/FarmProsperity/android/app/debug.keystore

# General
.DS_Store
*.log
EOF

git add .
git commit -m "Phase 0: Project foundation setup"
```

Create a GitHub repository and push:
```bash
git remote add origin https://github.com/YOUR_USERNAME/fps.git
git push -u origin main
```

---

## 0.8 — Phase 0 Checklist

Before moving to Phase 1, verify every item:

- [ ] Django runs: `python manage.py runserver` → opens at http://localhost:8000
- [ ] Django admin opens at http://localhost:8000/admin
- [ ] PostgreSQL container is running: `docker-compose ps`
- [ ] Django connects to DB: `python manage.py migrate` runs without errors
- [ ] React Native app opens on Android emulator
- [ ] Git repo created and first commit pushed
- [ ] `.env` file is NOT committed to Git

---

## Common Errors & Fixes

| Error | Fix |
|-------|-----|
| `psycopg2 not found` | Run `pip install psycopg2-binary` |
| `GDAL not found` (PostGIS error) | On Mac: `brew install gdal`. On Windows: install OSGeo4W |
| Android emulator won't start | In Android Studio → AVD Manager → cold boot |
| `pod install` fails | `sudo gem install cocoapods` then retry |
| Metro bundler port in use | Kill process on port 8081: `npx react-native start --reset-cache` |

---

## What's Next
**Phase 1** — Build the Django data models (Farmer, Crop Entry, Mandi) and the Django admin panel. Your team will be able to view all data from day one.
