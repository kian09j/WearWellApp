# WearWell

Wear what you love. Buy better, not more.

WearWell ([wearwellapp.com](https://www.wearwellapp.com)) is a wardrobe tracker by [Polska Picks](https://polskapicks.com). It helps people wear what they already own, see the real cost per wear of their clothes, and resell what they no longer use. Everything is stored on the device: no account, no tracking.

Status: **Phase 1 complete**. Phase 2 complete: CSV import, AI photo scan (switches on once an API key is added) and background removal.

## What it does

- **Quick count onboarding**: plus / minus per category creates placeholder pieces in under a minute. Photos and details are optional, always.
- **Today**: one tap logs a piece as worn; saved outfits, "same as yesterday", past days, undo, and a gentle streak.
- **Rediscovery card**: one in-season piece that has rested a while, rotating daily.
- **Cost per wear**: per piece, per category (with optional targets) and for the whole wardrobe.
- **Gentle nudges** for unworn pieces, counted only in in-season days: wear it this week, keep / sell / donate, sell on Vinted. All dismissable and reversible.
- **Vinted helper**: ready-to-copy listing title and description in Polish or English, a suggested price range, "Open Vinted", listed / sold status and a money-recovered total.
- **Before you buy**: projected cost per wear after 3, 6 and 12 months, similar pieces already owned, and a wishlist with an optional seven-day cooling-off.
- **Stats**: most and least worn, best value, cost per wear by category, colours, wardrobe value, share worn in the last 90 days, money recovered.
- **Photo scan** (optional): photograph a shelf or rail, Claude lists the pieces it sees, and you check and edit every row before anything is added.
- **Background removal** (optional): one tap in the piece editor cuts the piece out of its photo, on the phone itself, and "Bring the background back" undoes it. The piece then sits on a wash of its colour in the wardrobe.
- **Works offline** (installable PWA) and ships as **iOS and Android apps** (Capacitor) with an optional daily reminder.
- **Backup**: export / import everything, photos included, as one file.
- **CSV import** from other wardrobe apps or a spreadsheet: columns matched automatically (English and Polish headers), categories, colours, dates and prices understood loosely, a preview before anything is saved, duplicates skipped, and Undo. "Times worn" counts towards cost per wear as wears from before WearWell. A template is included.

## Run it

You need Node.js 20 or newer.

```bash
npm install
npm run dev
```

Open http://localhost:5173. On first run you get the welcome screen; "Explore a sample wardrobe" loads about 20 pieces and four months of outfits so every screen and nudge has something to show (Settings can remove it again).

### On your phone (same Wi-Fi)

```bash
npm run dev:phone
```

Open the "Network" address Vite prints, e.g. `http://192.168.1.20:5173`. Windows may ask to allow Node.js through the firewall the first time. Over plain http the offline service worker is off; it works on the deployed https site.

## Test and build

```bash
npm test          # unit tests (Vitest): CPW, unworn days, nudges, streak, resale, listings, stats, backup...
npm run typecheck # TypeScript
npm run build     # production build into dist/ (with the offline service worker)
npm run preview   # serve the production build locally
```

## Deploy the web app (Vercel)

1. In Vercel, "Add New Project" and import the GitHub repository. Vercel detects Vite: build command `npm run build`, output directory `dist`.
2. `vercel.json` already sends app routes to `index.html`; real files such as `/privacy.html` are served as they are.
3. Add the domain under Project → Settings → Domains: `wearwellapp.com` and `www.wearwellapp.com` (Vercel shows the DNS records to set at your registrar).

Every push to `main` deploys automatically.

## The native apps (Capacitor)

The iOS and Android apps wrap the same web build. Native extras: backups go through the share sheet, haptics when logging, links open in the system browser, native clipboard, the Android back button, and the daily reminder (a local notification, nothing is sent anywhere).

App id: `com.wearwellapp.app`. Icons and splash screens are generated from `public/icon.svg` with `npm run icons`, then `npx capacitor-assets generate --ios --iconBackgroundColor '#fbf6ec' --splashBackgroundColor '#fbf6ec'` for iOS (the script draws the Android splashes itself, because the Android part of that tool can fail on Windows with a file lock error).

### Android (works on Windows)

1. Install [Android Studio](https://developer.android.com/studio) (it brings the Android SDK and Java).
2. `npm run native:android` builds the web app, copies it into `android/` and opens Android Studio.
3. Press Run to try it on a connected phone (USB debugging on) or an emulator.
4. For the Play Store: Build → Generate Signed App Bundle (AAB). Keep the signing key safe; you need it for every update.

### iOS (needs your Mac)

1. Install Xcode from the Mac App Store. Clone the repository on the Mac and run `npm install`.
2. `npm run native:ios` builds, syncs and opens Xcode. Dependencies use Swift Package Manager, so no CocoaPods are needed.
3. In Xcode select the App target → Signing & Capabilities, choose your team, then Run on your iPhone.
4. For the App Store: Product → Archive, then Distribute App → App Store Connect.

After any code change: `npm run native:sync` (build + copy into both projects).

## Photo scan (Claude)

The only server-side code is `api/scan.ts`, a Vercel function, with its logic in `server/`. The app shrinks the photo to 1600px; the function checks the request and the daily limits, sends the photo to Claude with a fixed JSON schema (structured output), validates the answer and returns the list. The photo is never stored or logged. The API key only exists in Vercel's environment variables, never in the code or the app.

### Switch it on

1. **API key**: at [console.anthropic.com](https://console.anthropic.com) add billing, create an API key, and set a monthly spend limit as a safety net.
2. **Vercel**: Project → Settings → Environment Variables → add `ANTHROPIC_API_KEY` for Production (and Preview if you test there), then redeploy (Deployments → ⋯ → Redeploy).
3. **Daily limits that hold across servers (recommended)**: Vercel → Storage / Marketplace → **Upstash Redis** (free tier) → connect it to the project. It adds the `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` (or `KV_REST_API_*`) variables the function looks for. Without it the limits only hold within one running server instance.

Until step 2 is done, the app says "The photo scan is not switched on yet".

### Optional settings (environment variables)

| Variable | Default | Meaning |
|---|---|---|
| `SCAN_DAILY_LIMIT` | 5 | Scans per phone per day |
| `SCAN_IP_DAILY_LIMIT` | 20 | Scans per IP address per day |
| `SCAN_GLOBAL_DAILY_LIMIT` | 100 | Scans for the whole app per day (the cost ceiling) |
| `SCAN_MODEL` | `claude-opus-5-5` | Claude model used |
| `SCAN_EFFORT` | `low` | `low`, `medium` or `high`: more thinking is slower and pricier |
| `SCAN_ALLOWED_ORIGINS` | | Extra web origins allowed to call the function (comma separated) |

### Cost

With Claude Opus 5.5 ($4 per million input tokens, $20 per million output tokens), a 1600px photo is roughly 2,500 input tokens, and the answer plus a little thinking about 500 to 1,500 output tokens: **roughly $0.02 to $0.05 per scan**. At the default limits that is at most about $5 a day for the whole app. Check real usage in the Anthropic Console after the first scans. Claude Haiku 5.5 (`SCAN_MODEL=claude-haiku-5-5`) costs around 40 times less per token; whether it counts folded clothes as well is worth testing on your own photos before switching.

### Test it locally

The plain dev server has no functions. Run `npx vercel dev` (after `npx vercel link` and `npx vercel env pull`) to run the app and the function together, or point a dev build at a deployed site with `VITE_SCAN_API_URL=https://<your-preview>.vercel.app/api/scan npm run dev`.

## Background removal (on the device)

Nothing is uploaded: the model runs on the phone. The code is in three places:

- `src/domain/cutout.ts`: the maths (pixels into the model's input, its output into transparency, and whether a cutout is worth offering). Unit tested.
- `src/platform/cutout.worker.ts`: runs the model in a Web Worker so the screen stays responsive. It downloads the model the first time and keeps it in its own IndexedDB database, `wearwell-models`, which backups and "Erase everything" leave alone.
- `src/platform/backgroundRemoval.ts`: the canvas work around it, and the result as WebP with transparency (PNG where the browser cannot write WebP, which includes Safari and the iOS app, so those files are bigger).

**The model** is U²-Net small (`u2netp`, Apache 2.0, 4.6 MB). It takes a 320 × 320 image and runs on the processor with [onnxruntime-web](https://onnxruntime.ai) (MIT, WebAssembly, one thread). It is fetched from Hugging Face, pinned to one revision (`MODEL_URL` in the worker). To avoid that request, put the `.onnx` file in `public/` and point `MODEL_URL` at it.

**Downloads**: the first cutout downloads the model (4.6 MB). The web version also fetches the WebAssembly runtime from the site (14 MB, about 3.7 MB compressed); the native apps ship it inside the app. Neither is part of the offline precache, so people who never remove a background never download them; the service worker caches them on first use, so it works offline afterwards.

**Speed**: about 1 second per photo on a recent Mac. Not yet measured on phones. The very first cutout on a device is slower while the browser compiles the runtime.

**Models that were tried and not used**: BiRefNet lite (MIT) does not run in the browser (fixed 1024px input, runs out of memory). ormbg and ISNet (88 MB each in half precision, need WebGPU) gave similar results at thumbnail size for 20 times the download. `@imgly/background-removal` is AGPL and Bria's RMBG models are non-commercial, so both are ruled out.

**Dev note**: `optimizeDeps.exclude: ['onnxruntime-web']` in `vite.config.ts` is needed, because Vite's pre-bundling breaks how the runtime loads its WebAssembly.

## App store checklist

- **Accounts**: Apple Developer Program ($99 a year) and Google Play Console ($25 once). Apple asks EU distributors for a trader status declaration (traders' contact details are shown on the store page).
- **Google Play, new personal accounts**: a closed test with at least 12 testers for 14 days is required before you can publish to everyone. Plan for it.
- **Privacy policy URL**: `https://www.wearwellapp.com/privacy.html` (from `public/privacy.html`). **Add a contact email** where the page says so before publishing.
- **Privacy labels / Data safety**: no tracking and no accounts. With the photo scan, declare that photos the person chooses are sent to a third party (Anthropic) for app functionality, not stored and not linked to identity. The app already asks for consent before the first scan, as Apple requires for third-party AI.
- **Permissions**: iOS camera and photo library texts are in `ios/App/App/Info.plist`; Android asks for notifications (Android 13+) only when the reminder is switched on.
- **Store assets**: screenshots from the sample wardrobe work well; the icon is the rosette on paper.

## Linking from polskapicks.com

Suggested once Phase 1 is live: keep `polskapicks.com/szafa` (it ranks for Polish searches and people have data in it) and add a "Want more? Try WearWell" card there, plus links in the nav or footer and on the calculator. Later, an "Export to WearWell" button on /szafa can hand people's items over as a file (two different sites can't share browser storage).

## How the code is organised

```
src/
  domain/    Pure logic and types: no React, no database. Unit tested.
  data/      Dexie (IndexedDB) database, plus the functions and live-query hooks screens use.
  i18n/      Translations (locales/en.ts) and locale-aware date, money and country formatting.
  platform/  Web vs native differences: files, share sheet, haptics, links, clipboard, reminders.
  ui/        Shared components: layout, tab bar, buttons, dialogs, sheets, pickers, toasts, icons.
  screens/   One file per screen, plus the cards they share.
api/         The Vercel function for the photo scan (the only server code).
server/      Its logic: request checks, daily limits, the Claude request.
scripts/     Icon and splash generation for the native apps.
android/ ios/  Capacitor native projects.
```

### Data

- Every record has an `id`, `createdAt`, `updatedAt` and an optional `deletedAt`. Deleting marks a record as deleted instead of removing it (Undo works, and a future sync backend such as Supabase gets the tombstones it needs).
- Screens only import from `src/data/index.ts`, never from Dexie, so a sync layer can sit behind those functions without touching screens.
- Wear dates are local `YYYY-MM-DD` strings, never UTC timestamps, so a wear logged at 23:30 never lands on the wrong day.
- A wear's id is its piece and day (`wearId` in `src/domain/ids.ts`), so two devices logging the same wear agree on it. Database version 2 re-keyed older wears, and restoring an older backup re-keys its wears too.
- Settings that would follow the person to other devices (`SYNCED_SETTINGS` in `src/data/settings.ts`) have their own `prefsUpdatedAt`. Per-device changes, like skipping the rediscovery card, only move `updatedAt`.
- Photos are resized to 800px and re-encoded (WebP, JPEG where WebP isn't available), which also strips location data. They're stored as raw bytes, which works in every browser and WebView.
- Export is one JSON file, photos included. Import validates every record first and replaces the data in one transaction, so a broken file can never leave things half-imported.

### The rules behind the numbers

- **Cost per wear** = price paid / wears. Categories and the wardrobe add up what their priced pieces cost and divide by those pieces' wears (unworn priced pieces still add their cost). Currencies are never mixed.
- **Unworn days** count only completed, in-season days since the last wear (or since the piece was added or bought, if later). A stretch of 7+ days with no logging at all is skipped, so a holiday doesn't flood you with nudges.
- **Nudges**: 30 / 60 / 90 in-season days by default (configurable). Only pieces "in rotation" are nudged. "Later" snoozes two weeks; keeping for "another reason" pauses three months; occasion and sentimental pieces are never nudged.
- **Resale price** = price × condition factor (60% new with tags to 20% satisfactory) × age factor (10% less per year, at least half), shown as a ±15% range in friendly numbers.
- **Streak**: consecutive days with at least one wear; today not logged yet never breaks it.

### Translations

All UI text is in `src/i18n/locales/en.ts`. To add a language, copy it to e.g. `pl.ts` in the same folder and translate the values: it is picked up automatically for people whose phone uses that language. Plural entries can add `few` and `many` forms, which Polish needs. Dates, numbers and prices always use the person's own locale (`349 zł` in Poland).

The Vinted listing text is generated content in two fixed languages, so its Polish and English wording lives in `src/domain/listing.ts` (with Polish colour adjectives agreeing with the noun).

### Brand and accessibility

Colours and fonts match polskapicks.com: the "Łąka" palette (cream paper, warm ink, poppy, cornflower, sunflower, clover), Fraunces for headings and Figtree for text, bundled for offline use. Tokens live at the top of `src/index.css`. All text colour pairs meet WCAG AA contrast (4.5:1 or more); there is a darker clover and poppy for text on tinted cards. Controls are real buttons, links, radios and checkboxes with labels, tap targets are at least 40px (most 44px or more), dialogs are native `<dialog>` elements, live regions announce changes, and motion respects "reduce motion".

## Build plan

Phase 1 (done):

1. ✅ Foundations: project setup, brand tokens, translations, database and data layer, sample data, export/import, app shell
2. ✅ Item catalogue, quick-count onboarding, photos
3. ✅ Wear logging, outfits, streak
4. ✅ Rediscovery card
5. ✅ Cost per wear
6. ✅ Gentle nudges for unworn pieces
7. ✅ Vinted resale helper
8. ✅ Before you buy and wishlist
9. ✅ Stats
10. ✅ Offline (PWA) and native iOS / Android apps (Capacitor), daily reminder
11. ✅ Polish: accessibility pass, empty states, privacy page, README

Phase 2:

- ✅ CSV import (Settings → Your data, the Wardrobe empty state, or the welcome screen)
- ✅ Wardrobe photo scan (Claude, via one serverless function; needs the API key above)
- ✅ Background removal (on the device, U²-Net small)
