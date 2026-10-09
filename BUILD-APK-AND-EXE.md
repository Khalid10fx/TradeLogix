APK and Windows installer are built by GitHub Actions (.github/workflows/build-apk-exe.yml) from app/index.html.
Run: repo > Actions > Build APK and EXE > Run workflow. Result: repo > Releases > "Latest TradeCycle build".
Android: signed with a new key unless you add secrets ANDROID_KEYSTORE_B64, ANDROID_KEYSTORE_PASSWORD, ANDROID_KEY_ALIAS (a changed key means uninstalling the old app once).
