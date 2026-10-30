# WearWell

WearWell (wearwellapp.com) is a wardrobe tracker by Polska Picks: people log what they wear, see the real cost per wear, get gentle nudges for pieces they never reach for, and resell on Vinted. Everything stays on the device: no account, no tracking. React 19 + TypeScript + Vite 8 + Tailwind 4, data in IndexedDB through Dexie, iOS and Android apps through Capacitor, hosted on Vercel. `README.md` is the full guide (features, the rules behind the numbers, deploying, the app stores); `docs/sync-plan.md` is the plan for optional accounts and sync.

## Working on it

- Node 22.12 or newer. `npm run dev` (http://localhost:5173), `npm test`, `npm run typecheck`, `npm run build`. Run all three checks before committing and fix every failure.
- Pushing `main` deploys the live site. Work on a branch, push it for a Vercel preview (behind Vercel's login), let Ania try it on her phone, then fast-forward `main`. Never push `main` without her go-ahead.
- Commit messages: one plain summary line (like "Phase 2: background removal on the device"), then what changed and why.
- To see the backup reminder and the Home Screen tip without waiting weeks, open a preview or the dev server at `/?test-reminders`. The live build leaves that switch out.

## Code

- `src/domain/`: pure logic and types, no React and no Dexie, unit tested. New rules go here, with tests.
- `src/data/`: the only code that touches Dexie. Screens import from `src/data/index.ts`, never from Dexie.
- `src/platform/`: web versus native differences (files, share sheet, haptics, reminders, the background-removal worker).
- `src/screens/`: one file per screen, plus the cards they share. `src/ui/`: shared components.
- Match the surrounding code: its comment density, naming and small functions. Add a dependency only when it clearly earns its place.
- Data rules (README, "Data"):
  - Every record has `id`, `createdAt`, `updatedAt` and an optional `deletedAt`. Deleting sets `deletedAt` (Undo, and a future sync needs it), and every change bumps `updatedAt`.
  - Wear ids come from `wearId(itemId, date)`, one wear per piece per day. Wear dates are local `YYYY-MM-DD` keys, never UTC timestamps.
  - Settings that would follow the person to other devices are listed in `SYNCED_SETTINGS`; per-device settings stay out of it.
  - A schema change needs a new Dexie version with an upgrade and a test, like `src/data/db.test.ts`. Old backups must keep importing.
- Photos are resized to 800px and re-encoded on the device, which strips location data.

## The privacy promise

- Nothing leaves the device unless the person uses a feature that says so and agrees. Today that is only the photo scan, which asks for consent first. No analytics, ads or tracking.
- If a change sends anything anywhere, or downloads from a new third party, update `public/privacy.html` in the same change and say plainly what is sent.
- Keys and secrets live only in Vercel's environment variables, never in the code or the app.

## App text

- All UI text lives in `src/i18n/locales/en.ts`; never hard-code text in components. Dates, numbers and prices always go through the i18n formatters. A Polish `pl.ts` is planned; Polish plural entries need `few` and `many` forms.
- Voice: warm, plain and practical, like a friend who knows clothes. Never guilt-trip: nudges are gentle, can be dismissed and undone, and anything destructive has Undo or a confirmation.
- The app speaks as the app (no "I", no "we") and addresses the person as "you". British spelling (colour, recognise), no contractions ("does not"), straight double quotes around labels ("Add to Home Screen"), curly apostrophes in possessives (Anthropic’s), sentence case for buttons and headings.
- Never use the em dash (the long dash), anywhere: app text, docs, code comments, commit messages. Use a comma, colon, full stop or parentheses instead. The en dash only for ranges, like 2–3 days.
- The app is "by Polska Picks". Do not put Ania's name in the app, the store listings or the privacy page.
- Facts only: no invented numbers, prices, studies or brand claims.

## Look and accessibility

- Colours and fonts match polskapicks.com (the "Łąka" palette, Fraunces and Figtree; tokens at the top of `src/index.css`). Text colour pairs meet WCAG AA.
- Real buttons, links and labels, tap targets of at least 40px (44px where possible), native `<dialog>` for dialogs, and respect "reduce motion".
