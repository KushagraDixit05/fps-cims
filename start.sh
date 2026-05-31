#!/bin/bash

# start.sh - Quick start script for Farm Prosperity Solution

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

echo "🌱 Starting Farm Prosperity Solution (FPS)..."
echo "------------------------------------------------"

# 1. Database
echo "📦 Starting PostGIS database via Docker..."
cd "$DIR/backend"
docker compose up -d

# 2. Kill any stale Metro processes so port 8081 is always available
echo "🧹 Clearing stale Metro processes..."
pkill -f "react-native start" 2>/dev/null || true
pkill -f "metro" 2>/dev/null || true
sleep 1

# 3. Setup ADB Ports (helps if phone is already plugged in)
echo "🔌 Setting up ADB port forwarding..."
adb reverse tcp:8000 tcp:8000 2>/dev/null || true
adb reverse tcp:8081 tcp:8081 2>/dev/null || true

# Helper to open a new terminal window
open_terminal() {
    local title=$1
    local cmd=$2
    if command -v gnome-terminal &> /dev/null; then
        gnome-terminal --title="$title" -- bash -c "$cmd; exec bash"
    elif command -v x-terminal-emulator &> /dev/null; then
        x-terminal-emulator -T "$title" -e bash -c "$cmd; exec bash" &
    else
        echo "⚠️ Could not find a suitable terminal emulator. Please run this manually in a new tab:"
        echo "   $cmd"
    fi
}

# 3. Backend
echo "🐍 Starting Django backend in a new window..."
open_terminal "FPS Backend" "cd '$DIR/backend' && source venv/bin/activate && python manage.py runserver 0.0.0.0:8000"

# 5. Mobile (Metro) — always force port 8081, never allow fallback to 8082
echo "📱 Starting React Native Metro bundler in a new window..."
open_terminal "FPS Metro Bundler" "cd '$DIR/mobile/FarmProsperity' && npm start -- --port 8081"

echo "------------------------------------------------"
echo "✅ Done! Services are opening in new terminal windows."
echo ""
echo "To launch the Android app, run one of these commands:"
echo "  👉 Physical Device:   cd mobile/FarmProsperity && npm run android:phone"
echo "  👉 Emulator:          cd mobile/FarmProsperity && npm run android:emulator"
echo ""
