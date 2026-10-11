# WearWell

Wear what you love. Buy better, not more.

WearWell ([wearwellapp.com](https://www.wearwellapp.com)) is a wardrobe tracker by [Polska Picks](https://polskapicks.com). It helps people wear what they already own, see the real cost per wear of their clothes, and resell what they no longer use. Everything is stored on the device: no account, no tracking.

Status: Phase 1, step 6 of 11 (gentle nudges). See [Build plan](#build-plan).

## Run it

You need Node.js 20 or newer.

```bash
npm install
npm run dev
```

Open http://localhost:5173. Settings → "Load sample wardrobe" fills the app with about 20 pieces and four months of outfits, so every screen has something to show.

### On your phone

```bash
npm run dev:phone
```

Vite prints a "Network" address such as `http://192.168.1.20:5173`. Open it on a phone on the same Wi-Fi. (Windows may ask to allow Node.js through the firewall the first time.)

## Test and build

```bash
npm test          # unit tests (Vitest)
npm run typecheck # TypeScript
npm run build     # production build into dist/
npm run preview   # serve the production build locally
```

## Deploy (Vercel)

1. Push this repository to GitHub.
2. In Vercel, "Add New Project" and import the repository. Vercel detects Vite: build command `npm run build`, output directory `dist`.
3. `vercel.json` already sends every route to `index.html`, so deep links like `/wardrobe` work.
4. Add the domain under Project → Settings → Domains: `wearwellapp.com` and `www.wearwellapp.com` (Vercel shows the DNS records to set at your domain registrar).

## How the code is organised

```
src/
  domain/    Pure logic and types, no React, no database. Unit tested.
  data/      Dexie (IndexedDB) database, plus the functions and live-query hooks screens use.
  i18n/      Translations (locales/en.ts) and locale-aware date and money formatting.
  platform/  Things that differ between web and the native apps (saving and opening files).
  ui/        Shared components: layout, tab bar, buttons, dialogs, toasts, ornaments.
  screens/   One file per screen.
```

### Data

- Every record has an `id`, `createdAt`, `updatedAt` and an optional `deletedAt`. Deleting an item marks it as deleted instead of removing it. This is what a sync backend (for example Supabase) needs later.
- Screens only import from `src/data/index.ts`, never from Dexie. A sync layer can sit behind those functions without touching screens.
- Wear dates are stored as local `YYYY-MM-DD` strings, never UTC timestamps, so a wear logged at 23:30 never lands on the wrong day.
- Photos are stored as raw bytes (`ArrayBuffer`), which works reliably in every browser and WebView.
- Export creates one JSON file with everything, photos included. Import validates every record first and then replaces the data in a single transaction, so a broken file can never leave things half-imported.

### Translations

All UI text is in `src/i18n/locales/en.ts`. To add a language, copy it to e.g. `pl.ts` in the same folder and translate the values. It is picked up automatically (people whose phone is set to that language get it). Plural entries can add `few` and `many` forms, which Polish needs.

Dates, numbers and prices always use the person's own locale (`349 zł` in Poland, `€84` in Ireland), whatever the UI language.

### Brand

Colours and fonts match polskapicks.com: the "Łąka" palette (cream paper, warm ink, poppy red, cornflower, sunflower, clover), Fraunces for headings and Figtree for text. The tokens live at the top of `src/index.css`. Fonts are bundled with the app (Fontsource), so they work offline.

## Build plan

Phase 1 (stopping for review after each step):

1. ✅ Foundations: project setup, brand tokens, translations, database and data layer, sample data, export/import, app shell
2. ✅ Item catalogue, quick-count onboarding, photos
3. ✅ Wear logging, outfits, streak
4. ✅ Rediscovery card
5. ✅ Cost per wear
6. ✅ Gentle nudges for unworn pieces
7. Vinted resale helper
8. Before you buy and wishlist
9. Stats
10. Offline (PWA) and native iOS / Android apps (Capacitor), daily reminder
11. Polish: accessibility pass, empty states, final README

Phase 2: wardrobe photo scan (AI), background removal, CSV import.
