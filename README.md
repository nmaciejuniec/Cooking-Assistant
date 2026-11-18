# Cooking Assistant

Our household recipe app: an **Android app** (tablet or phone) and a **Mac app**.
No login. Interface in Polish, English or Danish. AI features use your own Anthropic API key.

## Download
There is one release, **Cooking Assistant** (tag `latest`), under **Releases** on the right of this page:
- [`CookingAssistant.apk`](../../releases/latest/download/CookingAssistant.apk) for Android
- [`CookingAssistant.dmg`](../../releases/latest/download/CookingAssistant.dmg) for Mac (Apple Silicon and Intel)

Every change to the app builds new files that replace the old ones, so the links above always give the newest version.
The build before is kept as `CookingAssistant-previous.apk` / `CookingAssistant-previous.dmg`, in case a new version has a problem
(installing the previous APK over a newer one needs uninstalling first, so save a sync file before).
The release notes show when each file was built. The Mac file can be one build behind for a while,
because GitHub's Mac machines are sometimes busy. The build date is also shown in the app under **⚙ Settings → Data on this device**.

## Install on Android (Samsung tablet)
1. On the tablet, open the APK link above in Chrome.
2. When the download finishes, tap **Open**. Android asks to allow installing apps from Chrome:
   tap **Settings**, turn on **Allow from this source**, go back and tap **Install**.
3. If Google Play Protect warns about an unknown app, tap **More details → Install anyway**.
   The app is not in the Play Store, so this warning is expected.

**Updating:** download the APK again and install it over the app. Recipes stay, because every build is signed with the same key.
Do not uninstall the app before updating: uninstalling deletes the recipes stored in it.

## Install on Mac
1. Download the DMG and open it. Drag **Cooking Assistant** onto **Applications**.
2. The first time, macOS says it can't verify the developer (the app is not signed with a paid Apple certificate).
   Click **Done**, open **System Settings → Privacy & Security**, click **Open Anyway** next to Cooking Assistant, and confirm.
3. For home Wi-Fi sync, macOS asks once whether the app may find devices on the local network: click **Allow**.

**Updating:** drag the new app into Applications again (replace). Recipes stay.

## AI: your Anthropic API key
1. Go to https://console.anthropic.com → **API keys** → create a key (for example one called `tablet` and one called `mac`).
2. Add credit under **Billing** and set a monthly spend limit.
3. In the app: **⚙ Settings → API key** → paste → **Save** → **Test key**.

The key stays in the app on that device: never in this repository, never synced. Anyone using the tablet can use the AI on your bill;
if a device is lost or sold, delete its key in the Console. Without a key the app still works, just without AI features.

## Syncing the tablet and the Mac
**Home Wi-Fi sync (automatic).** The devices talk directly over the home Wi-Fi, with no cloud and no account.
1. On the Mac: **⚙ Settings → Home sync (Wi-Fi) → Create a home network**. A QR code and 24 words appear.
2. On the tablet: **⚙ Settings → Home sync (Wi-Fi) → Join a network → Scan QR code** (or type the words).
3. Keep both apps open on the same Wi-Fi. Recipes, pictures, marks and the assistant memory then sync by themselves:
   when the app opens, after every change and every 15 seconds. Treat the QR code and the words like a password.

**Sync file (backup).** **⚙ Settings → Save sync file** on one device, send it (Drive, email…), **Load and merge file** on the other.
Merging keeps the newest version of each recipe and never overwrites with an older one. Save a sync file now and then as a backup.

## Features
- Add recipes from a link, a photo (also straight from the camera), PDF, Word (.docx), text, pasted text, or by hand
- Original language kept; AI translations to Polish, English and Danish
- Scale servings; units as written, in g/ml, or in cups and spoons (approximate values marked ≈); °F → °C
- Categories with subcategories, tags in the interface language, search (also in ingredients), Favourites and To try
- A picture for every recipe: from the recipe page, your own photo, or a simple illustration drawn by Claude (marked as AI)
- Personal notes, and clearly marked AI notes that never mix with the original recipe; AI can simplify long steps
- Cook mode: ingredients and steps on one screen, ingredients ticked off as steps are finished, screen kept on
- Duplicate detection, A5 PDF for a recipe binder, export
- Cooking assistant that knows both of your tastes and remembers lasting preferences
- Recipe-card look in green, red or brown, or the plain Modern look; light, dark or system theme

## For developers
- `index.html` is the whole app (plain HTML/JS, no build step). Recipes are stored in IndexedDB (pictures too),
  and every recipe that comes in from storage, a file or the other device is checked and repaired by `normalizeRecipe()`.
- `vendor/` holds the libraries, bundled so the app works offline: pdf.js 3.11.174 (Apache-2.0, run with
  `isEvalSupported:false`), mammoth (BSD-2), html2canvas (MIT), jsPDF 3 (MIT), qrcode-generator (MIT) and jsQR (Apache-2.0).
  Their licenses are in `vendor/licenses/`.
- Android: Capacitor (`capacitor.config.json`). `scripts/android-native.sh` adds icons (`native/android/res`),
  the Wi-Fi sync plugin (`native/android/java/LanSyncPlugin.java`: Bonjour via `NsdManager` + TCP) and its permissions.
- Mac: Electron (`electron/`), packaged by electron-builder and ad-hoc signed. Wi-Fi sync uses `bonjour-service` + TCP in `electron/main.js`.
- Wi-Fi sync logic, encryption (AES-256-GCM, key derived with HKDF from a 32-byte secret) and pairing (QR / 24 BIP39 words)
  live in `index.html`; the native parts only find devices and move encrypted bytes.
- `.github/workflows/build.yml` builds both apps on every push to `main`; `scripts/release.sh` puts them in the `latest` release
  and removes any other release.
- Android signing: repository secrets `ANDROID_KEYSTORE_BASE64` (the keystore) and `ANDROID_KEYSTORE_PASSWORD` (alias `cookingassistant`).
  The build checks the certificate (SHA-256 `7C:90:6D:B2:…:1D:2D:40`) so every build installs over the previous one.
  Keep a private copy of the keystore and its password: without them, updates cannot be installed over the app.
- `release.sh` keeps one previous APK and DMG next to the newest ones.
- `scripts/test-links.mjs` + `tests/links.txt`: a GitHub Actions check that recipe websites can be read.
