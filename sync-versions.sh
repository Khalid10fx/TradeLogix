#!/usr/bin/env bash
# Keeps all TradeCycle versions on the SAME code. Edit app/index.html only, then run this.
# Web:     app/index.html            (served at /app)
# Desktop: desktop/TRADECYCLE.html   (packed into the Windows installer)
# Android: downloads/TRADECYCLE.html (the file placed in the APK at assets/TRADECYCLE.html)
set -e
cd "$(dirname "$0")"
cp app/index.html desktop/TRADECYCLE.html
cp app/index.html downloads/TRADECYCLE.html
echo "Synced:"; md5sum app/index.html desktop/TRADECYCLE.html downloads/TRADECYCLE.html
