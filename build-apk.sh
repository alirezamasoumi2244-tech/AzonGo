#!/usr/bin/env bash
# Builds a DEBUG APK. Needs Android SDK (ANDROID_HOME set, or android/local.properties with sdk.dir=...).
set -euo pipefail
cd "$(dirname "$0")"
npx cap sync android
cd android
./gradlew assembleDebug
echo
echo "APK: android/app/build/outputs/apk/debug/app-debug.apk"
