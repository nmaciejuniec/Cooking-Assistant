# Cooking Assistant

A personal recipe app for our household: an **Android app** (tablet or phone) and a **Mac app**.
No login. AI features use your own Anthropic API key.

## Download
Open **Releases** on the right side of this repository page (or the *Releases* link under the code)
and download from the newest release:
- `CookingAssistant.apk` for Android
- `CookingAssistant.dmg` for Mac (Apple Silicon and Intel)

A new release is built automatically every time the app changes.

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
Each device keeps its own recipes. To move changes:
**⚙ Settings → Save sync file** on one device (Android opens the share menu: save to Drive, send by email…;
Mac asks where to save) → get the file to the other device → **Load and merge file** there.
Merging adds new recipes, keeps the newer version of each recipe and removes recipes deleted on the other device.
It never replaces a newer version with an older one. The sync file also carries the assistant profile and memory,
never the API key. Save a sync file now and then as a backup.

### Moving recipes from the Claude version
In the Claude version: **⋯ → Backup (JSON)** (Polish: *Kopia zapasowa (JSON)*) → get the file to the device
→ **⚙ Settings → Load and merge file**.

## Features
- Add recipes from a photo, PDF, Word (.docx), text file, saved web page (.html), pasted text, or manually
- Original language kept, AI translations to Polish, English and Danish
- Scale servings, grams/ml conversion (approximate values marked ≈), °F → °C
- Categories, tags, search (including ingredients), Favourites and To try
- Personal notes, and clearly marked AI notes that never mix with the original recipe
- Cook mode: ingredients and steps on one screen, the current step's ingredients highlighted with amounts, screen kept on
- Duplicate and similar recipe detection
- A5 PDF for one recipe or a whole recipe notebook
- Cooking assistant that knows both of your tastes and remembers lasting preferences
- Light, dark or system theme; interface in Polish or English

## For developers
- `index.html` is the whole app (plain HTML/JS, no build step).
- Android: Capacitor (`capacitor.config.json`, icons in `native/android/res`).
  `native/android/debug.keystore` is a fixed signing key so updates install over each other; it is a personal app key, not a secret.
- Mac: Electron (`electron/`), packaged by electron-builder and ad-hoc signed.
- `.github/workflows/build.yml` builds both on every push to `main` and creates a Release.
- The same `index.html` also works as a web app (GitHub Pages) if ever needed.
