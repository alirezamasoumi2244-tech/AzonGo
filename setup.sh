#!/usr/bin/env bash
# Prepares the Android project. Needs: Node 18+, JDK 17, internet (first run only).
set -euo pipefail
cd "$(dirname "$0")"
npm install
pip3 install --user --quiet pillow 2>/dev/null || true
[ -d android ] || npx cap add android
python3 tools/patch_android.py
npx cap sync android
echo
echo "Done. Open the 'android' folder in Android Studio, or run:  ./build-apk.sh"
