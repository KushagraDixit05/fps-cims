#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# run-android.sh — Smart launcher for FarmProsperity
#
# Detects whether an emulator or a physical device is connected
# via ADB and passes the correct reactNativeArchitectures flag
# to Gradle, so you never have to edit gradle.properties again.
#
# Usage:
#   npm run android            → auto-detect (this script)
#   npm run android:phone      → force arm64-v8a (physical device)
#   npm run android:emulator   → force x86_64    (emulator)
# ─────────────────────────────────────────────────────────────

set -e

# ── Resolve which ABI to build ────────────────────────────────

ARCH="${REACT_NATIVE_ARCHITECTURES:-}"   # allow env override

if [ -z "$ARCH" ]; then
  # Check connected ADB devices
  EMULATOR_COUNT=$(adb devices 2>/dev/null | grep -c "^emulator" || true)
  DEVICE_COUNT=$(adb devices 2>/dev/null | grep -v "^emulator" | grep -c "device$" || true)

  if [ "$DEVICE_COUNT" -gt 0 ] && [ "$EMULATOR_COUNT" -gt 0 ]; then
    # Both connected — prefer physical device, warn user
    echo ""
    echo "⚠️  Both a physical device AND an emulator are connected."
    echo "   Defaulting to physical device (arm64-v8a)."
    echo "   Use 'npm run android:emulator' to target the emulator explicitly."
    echo ""
    ARCH="arm64-v8a"
  elif [ "$DEVICE_COUNT" -gt 0 ]; then
    echo "📱 Physical device detected → building arm64-v8a"
    ARCH="arm64-v8a"
  elif [ "$EMULATOR_COUNT" -gt 0 ]; then
    echo "🖥️  Emulator detected → building x86_64"
    ARCH="x86_64"
  else
    echo ""
    echo "❌  No ADB device or emulator found."
    echo "    Please connect your device or start an emulator first."
    echo ""
    exit 1
  fi
fi

echo "🔧 Architecture: $ARCH"
echo ""

# ── Run React Native ──────────────────────────────────────────

npx react-native run-android \
  --extra-params "-PreactNativeArchitectures=$ARCH"
