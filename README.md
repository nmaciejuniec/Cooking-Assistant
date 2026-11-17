# Cooking Assistant

A personal recipe app for our household: an **Android app** (tablet or phone) and a **Mac app**.
No login. AI features use your own Anthropic API key.

## Download
Open **Releases** on the right side of this repository page (or the *Releases* link under the code)
and download from the newest release:
- `CookingAssistant.apk` for Android
- `CookingAssistant.dmg` for Mac (Apple Silicon and Intel)

A new release is built automatically every time the app changes. Only the newest release is kept
(plus the newest one with a Mac DMG, while the new Mac build is still running or GitHub has no Mac machine free).

## Install on Android (Samsung tablet)
1. On the tablet, open this repository in Chrome → **Releases** → tap `CookingAssistant.apk`.
2. When the download finishes, tap **Open**. Android asks to allow installing apps from Chrome:
   tap **Settings**, turn on **Allow from this source**, go back and tap **Install**.
3. If Google Play Protect warns about an unknown app, tap **More details → Install anyway**.
   The app is not in the Play Store, so this warning is expected.
4. Open **Cooking Assistant** from the app list.

**Updating:** download the new APK from the newest release and install it the same way.
Your recipes stay, because every version is signed with the same key.
Do not uninstall the app before updating: uninstalling deletes the recipes stored in it.

## Install on Mac
1. Download `CookingAssistant.dmg` from the newest release and open it.
2. Drag **Cooking Assistant** onto the **Applications** folder.
3. Open the app from Applications. The first time, macOS says it can't verify the developer
   (the app is not signed with a paid Apple certificate). Click **Done**,
   then open **System Settings → Privacy & Security**, scroll down and click **Open Anyway** next to Cooking Assistant,
   and confirm. After that it opens normally.
4. For home Wi-Fi sync, macOS asks once whether the app may find devices on the local network: click **Allow**.

**Updating:** download the new DMG and drag the app into Applications again (replace). Recipes stay.

## AI: your Anthropic API key
1. Go to https://console.anthropic.com → **API keys** → create a key (for example one called `tablet` and one called `mac`).
2. Add credit under **Billing**, and set a monthly spend limit in the Console's limits settings.
3. In the app: **⚙ Settings → API key** → paste → **Save** → **Test key**.

- The key is stored only in the app on that device. It is never in this repository and never in sync files.
- Anyone using the tablet can use the AI on your bill. If a device is lost or sold, delete its key in the Anthropic Console.
- Model: Sonnet 5.5 (better quality) or Haiku 5.5 (cheaper, faster), switchable in Settings.
- Without a key the app still works, just without AI features.

## Syncing between devices
### Home Wi-Fi sync (automatic)
Devices talk directly to each other over the home Wi-Fi, with no cloud and no account (the same idea as Murmur).
1. On the Mac: **⚙ Settings → Home sync (Wi-Fi) → Create a home network**. A QR code and 24 words appear.
2. On the tablet: **⚙ Settings → Home sync (Wi-Fi) → Join a network → Scan QR code** (or type the words).
3. Keep both apps open on the same Wi-Fi. Recipes, pictures, marks and the assistant memory sync by themselves:
   when the app opens, after every change and every 15 seconds. The API key is never synced.

The Mac asks once to allow devices on the local network: choose **Allow**. Treat the QR code and the words like a
password. Technically: Bonjour (`_cookassist._tcp`) finds the devices, every message is encrypted with AES-256-GCM
using a key derived from the shared 32-byte secret, and merging keeps the newest version of each recipe.

### Sync file (manual, also a backup)
Each device keeps its own recipes. To move changes by hand:
**⚙ Settings → Save sync file** on one device (Android opens the share menu: save to Drive, send by email…;
Mac asks where to save) → get the file to the other device → **Load and merge file** there.
Merging adds new recipes, keeps the newer version of each recipe and removes recipes deleted on the other device.
It never replaces a newer version with an older one. The sync file also carries the assistant profile and memory,
never the API key. Save a sync file now and then as a backup.

### Moving recipes from the Claude version
In the Claude version: **⋯ → Backup (JSON)** (Polish: *Kopia zapasowa (JSON)*) → get the file to the device
→ **⚙ Settings → Load and merge file**.

## Features
- Add recipes from a link (the app downloads the page and reads the recipe), a photo, PDF, Word (.docx), text file, pasted text, or manually.
  If a website refuses the download, copy the recipe text and paste it instead.
- Original language kept, AI translations to Polish, English and Danish
- Scale servings; units as written, in g/ml, or in cups and spoons (approximate values marked ≈); °F → °C
- Categories with subcategories (e.g. Cakes › Cheesecakes), tags, search (including ingredients), Favourites and To try
- A picture for every recipe: the photo from the recipe page (downloaded automatically when adding from a link),
  your own photo, or a simple illustration drawn by Claude (marked as an AI picture)
- Personal notes, and clearly marked AI notes that never mix with the original recipe
- Simplify long steps with AI (marked, the original can be restored with one tap)
- Cook mode: ingredients and steps on one screen, the current step's ingredients highlighted with amounts,
  ingredients ticked off as steps are finished, screen kept on
- Duplicate and similar recipe detection
- A5 PDF for one recipe or a whole recipe notebook
- Cooking assistant that knows both of your tastes and remembers lasting preferences
- Home Wi-Fi sync between the tablet and the Mac (see above)
- Recipe-card look in green, red or brown (or the plain Modern look); light, dark or system theme; interface in Polish or English

## For developers
- `index.html` is the whole app (plain HTML/JS, no build step).
- Android: Capacitor (`capacitor.config.json`). `scripts/android-native.sh` adds our own parts to the generated
  project: icons (`native/android/res`), the home Wi-Fi sync plugin (`native/android/java/LanSyncPlugin.java`,
  Bonjour via `NsdManager` + TCP) and its permissions.
  The APK is signed with the app's own key, kept as repository secrets: `ANDROID_KEYSTORE_BASE64` (the keystore)
  and `ANDROID_KEYSTORE_PASSWORD` (its password; alias `cookingassistant`). The build checks the certificate
  (SHA-256 `7C:90:6D:B2:4F:3C:37:17:D1:6B:B7:D5:BF:A8:FA:73:4D:A0:50:67:73:1C:93:DC:3D:61:EC:B8:A4:1D:2D:40`),
  so every version installs over the previous one. Keep a private copy of the key: without it, updates cannot be installed over the app.
- Mac: Electron (`electron/`), packaged by electron-builder and ad-hoc signed. Wi-Fi sync uses `bonjour-service` + TCP in `electron/main.js`.
- Wi-Fi sync logic, encryption (AES-256-GCM, key from a 32-byte secret via HKDF) and pairing (QR / 24 BIP39 words) live in `index.html`;
  the native parts only find devices and move encrypted bytes.
- `vendor/`: `qrcode.js` (qrcode-generator, MIT) and `jsQR.js` (jsQR, Apache-2.0) for showing and scanning the pairing QR code.
- `.github/workflows/build.yml` builds both on every push to `main` and creates a Release.
- `manifest.webmanifest`, `sw.js` and `icons/` let the same `index.html` also run as an installable web app if ever needed.
- `scripts/test-links.mjs` + `tests/links.txt`: a GitHub Actions check that recipe websites can be read (results appear as notes on the run).
