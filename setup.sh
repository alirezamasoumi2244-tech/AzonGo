#!/usr/bin/env bash
# Prepares the Android project. Needs: Node 18+, JDK 17, internet (first run only).
set -euo pipefail
cd "$(dirname "$0")"
npm install
[ -d android ] || npx cap add android
python3 tools/patch_android.py
npx cap sync android
python3 tools/patch_android.py
echo
echo "Done. Open the 'android' folder in Android Studio, or run:  ./build-apk.sh"
