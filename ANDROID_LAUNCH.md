# Android / Play Store Launch Checklist

This is what you need to do **after pulling this repo locally** to ship Noteshare to the Google Play Store. The codebase is already prepped (Capacitor config, deps, meta tags). Everything below requires Android Studio + a Google Play Console account.

---

## 1. Generate the Android Native Project

```bash
npm install
npm run build
npx cap add android
npx cap sync android
npx cap open android
```

Re-run `npm run build && npx cap sync android` every time you change web code.

---

## 2. AndroidManifest.xml — Required Permissions

Open `android/app/src/main/AndroidManifest.xml` and confirm these permissions are present (Capacitor adds `INTERNET` automatically; the rest are app-specific):

```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.RECORD_AUDIO" />
<uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />

<!-- Only if you ship video recording later -->
<uses-permission android:name="android.permission.CAMERA" />

<!-- Android 13+ runtime notification permission (required if you add native push) -->
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />

<!-- Required for foreground audio / recording on Android 14+ if used -->
<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE_MICROPHONE" />
```

Inside the `<application>` tag, ensure:

```xml
android:usesCleartextTraffic="false"
android:requestLegacyExternalStorage="false"
```

---

## 3. App Links (OAuth deep-link return)

Google sign-in returns to `https://jazz-scene-alive.lovable.app/auth`. For Android to open this URL inside the app instead of the browser:

### a) Add an intent filter to the `MainActivity` in `AndroidManifest.xml`:

```xml
<intent-filter android:autoVerify="true">
  <action android:name="android.intent.action.VIEW" />
  <category android:name="android.intent.category.DEFAULT" />
  <category android:name="android.intent.category.BROWSABLE" />
  <data android:scheme="https"
        android:host="jazz-scene-alive.lovable.app"
        android:pathPrefix="/auth" />
</intent-filter>
```

### b) Host an `assetlinks.json` file at `https://jazz-scene-alive.lovable.app/.well-known/assetlinks.json`:

```json
[{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app",
    "package_name": "com.noteshare.app",
    "sha256_cert_fingerprints": ["YOUR_SHA256_FROM_PLAY_CONSOLE"]
  }
}]
```

Get the SHA-256 from **Play Console → Setup → App signing → App signing key certificate** (after you upload your first AAB).

---

## 4. Launcher Icons & Splash

Generate adaptive icons (Android 8+ requirement) — easiest with `@capacitor/assets`:

```bash
npm install --save-dev @capacitor/assets
# Drop a 1024x1024 source at resources/icon.png and 2732x2732 at resources/splash.png
npx capacitor-assets generate --android
```

Or use **Android Studio → File → New → Image Asset** to import `public/app-icon-1024.png` as the launcher icon.

---

## 5. Signing — Generate the Upload Keystore

```bash
keytool -genkey -v -keystore noteshare-upload.keystore \
  -alias noteshare -keyalg RSA -keysize 2048 -validity 10000
```

Add to `android/key.properties` (DO NOT commit):

```
storePassword=...
keyPassword=...
keyAlias=noteshare
storeFile=../../noteshare-upload.keystore
```

Wire it into `android/app/build.gradle` (`signingConfigs` + `release` build type) — Android Studio's "Generate Signed Bundle" wizard will set this up automatically the first time.

---

## 6. Build the Release AAB

```bash
cd android
./gradlew bundleRelease
# Output: android/app/build/outputs/bundle/release/app-release.aab
```

Upload this `.aab` to Play Console.

---

## 7. Play Console Listing — Required Items

- **Privacy Policy URL** (mandatory; Noteshare collects email + audio + usage data)
- **Data Safety form**: declare collection of Email, Audio recordings, App activity, Crash logs
- **Content rating** questionnaire (likely "Everyone")
- **Target API level**: must be **34+** (Android 14) — set in `android/variables.gradle`:
  ```
  targetSdkVersion = 34
  compileSdkVersion = 34
  ```
- **App category**: Music & Audio
- **Screenshots**: phone (min 2), 7" tablet, 10" tablet
- **Feature graphic**: 1024×500
- **Short description** (80 chars), **Full description** (4000 chars)

---

## 8. Billing Note

The app currently uses **Stripe** for subscriptions on web + Android (Apple IAP only on iOS). Google Play policy requires Google Play Billing for **digital goods** sold to Play Store users. Before you publish to production:

- Either implement Google Play Billing via `@capgo/native-purchases` (it supports Android), OR
- Confirm your category qualifies for external billing under Play's User Choice Billing program.

This is the one item that may block production approval — handle before submitting for review.

---

## 9. Test Before Submitting

- Internal testing track first (instant rollout, up to 100 testers)
- Verify: Google sign-in returns into app, audio recording works, Stripe checkout opens (in Custom Tab), session timer survives backgrounding

---

## What's Already Done in This Repo

- ✅ `@capacitor/android@^8.1.0` installed
- ✅ `capacitor.config.ts` has `android` block (mixed content blocked, debugging off)
- ✅ Splash + StatusBar plugins configured for Android
- ✅ `index.html` has `mobile-web-app-capable` + `application-name` meta tags
- ✅ JSON-LD schema declares Android support
- ✅ Service worker is disabled on all native platforms (prevents WebView caching bugs)
- ✅ OAuth uses `@capacitor/browser` (Chrome Custom Tabs on Android)
- ✅ Audio recorder has format fallback (works with Android WebView's MediaRecorder)
