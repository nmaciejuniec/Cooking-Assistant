# Cooking Assistant

A personal recipe app for our household. It runs in the browser, needs no login, works offline,
and can be installed on the home screen like a normal app (for example on the Samsung tablet).
AI features use your own Anthropic API key.

**Live app:** https://nmaciejuniec.github.io/Cooking-Assistant/ (after GitHub Pages is turned on, see below)

## Features
- Add recipes from a photo, PDF, Word (.docx), text file, saved web page (.html), pasted text, or manually
- Recipe text kept in its original language, with AI translations to Polish, English and Danish
- Scale servings, switch units to grams and ml (approximate conversions are marked ≈), °F → °C
- Categories, tags, search (including ingredients), Favourites and To try marks
- My notes per recipe, and clearly marked AI notes that never mix with the original recipe
- Cook mode: big text, step by step, ingredient checklist, screen kept on
- Duplicate and similar recipe detection
- A5 PDF for a single recipe or a whole recipe notebook (optional wider margin for a binder)
- Cooking assistant that knows both of your tastes, remembers lasting preferences,
  suggests saved recipes and comes up with new ones (marked as AI-generated)
- App interface in Polish or English (PL | EN switch in the header)

## Files
- `index.html`: the whole app
- `manifest.webmanifest`, `sw.js`, `icons/`: what makes it installable and offline
- `.nojekyll`: tells GitHub Pages to serve the files as they are

Your recipes are NOT stored in this repository. The repo only holds the app code;
recipes live in the browser on each device.

## 1. Turn on GitHub Pages (one time)
1. In this repository open **Settings → Pages**.
2. Under *Build and deployment* set **Source: Deploy from a branch**, **Branch: main**, folder **/(root)**, and click **Save**.
3. After 1-2 minutes the app is live at https://nmaciejuniec.github.io/Cooking-Assistant/
   (the Pages settings page shows the exact link).

## 2. Install on the tablet
Open the link in Chrome (or Samsung Internet) → browser menu → **Add to home screen** or **Install app**.
It opens fullscreen and works offline after the first visit.

Important: recipes are stored in that browser. Always use the app from the same browser on a device,
and don't clear that browser's site data, or the recipes on that device are gone.
Save a sync file now and then as a backup.

## 3. AI: your Anthropic API key
1. Go to https://console.anthropic.com → **API keys** → create a key, for example named `tablet`.
2. Add credit under **Billing**, and set a monthly spend limit in the Console's limits settings,
   so a mistake or a lost tablet can never cost much.
3. In the app: **⚙ Settings → API key** → paste → **Save** → **Test key**.

Safety notes:
- The key is stored only in that browser on that device. It is never in the code on GitHub and never in sync files.
- Anyone who uses the tablet can use the AI on your bill, and someone with technical skills could read the key
  from the browser. At home that's a reasonable risk. If the tablet is lost or sold, delete the key in the Anthropic Console.
- Never commit the key to GitHub or send it in chats.
- Model: Sonnet 5.5 (better quality) or Haiku 5.5 (cheaper, faster). Switch in Settings.
- Without a key the app still works, just without AI features.

## 4. Moving recipes from the Claude version
In the Claude version of the app: **⋯ → Backup (JSON)** (in Polish: *Kopia zapasowa (JSON)*) → save the file
→ send it to the tablet → in this app: **⚙ Settings → Load and merge file**.

## 5. Syncing between devices (phone ↔ tablet)
Every device keeps its own copy. To sync:
**⚙ Settings → Save sync file** (`recipes-sync-DATE.json`) on device A → send it (Google Drive, email, Messenger)
→ **Load and merge file** on device B.

Merging adds new recipes, keeps the newer version of each recipe, and removes recipes deleted on the other device.
It never replaces a newer version with an older one. For two-way sync, do it in both directions.
If the same recipe was edited on two devices, the later edit wins.
The sync file also carries the assistant profile and memory (not the chats, not the API key).

## 6. Mum (read-only, no AI)
Send her the link and a **Recipes-only file** (`recipes-DATE.json`, from Settings). She opens the link,
installs it if she likes, and loads the file. Her copy is separate: nothing she does changes your recipes.
Without a key she has no AI; everything else works. Send her a new file when you add recipes.

## Updating the app
Changes are committed to the `main` branch of this repository. GitHub Pages republishes automatically,
and devices pick up the new version the next time they open the app while online.
