# Optional account, backup and sync: plan

Status: **plan only; Phase 0 done** (25 October 2026: fixed wear ids, `prefsUpdatedAt`, the photo clean-up fix). Written 25 October 2026; prices checked the same day. The app must keep working fully without an account: the account only adds backup and sync across devices (phone and laptop, or a reinstall).

## 1. Recommendation in short

- Sync is an opt-in layer behind `src/data/index.ts`, so screens do not change. Without an account the app makes **no** calls to the backend: the sync code only loads after sign-in.
- **Backend: Supabase in Frankfurt (eu-central-1).** Free plan while building, Pro ($25 a month) at launch.
- **Login: a one-time code by email, nothing else at first.** With no Google login there is no Sign in with Apple requirement (App Store guideline 4.8). Add Apple and Google together later, only if people ask.
- **Sync model:** one generic `records` table, the newest version of a record wins, and a server-assigned sequence number as the pull cursor. Photos go to a private Storage bucket.
- **Fix wear ids first** (see section 3): today two devices would create duplicate wears and double the cost-per-wear counts.
- **No end-to-end encryption in v1.** Encrypted in transit and at rest, with room to add it later.
- In-app account deletion plus a web deletion page. Privacy page and store labels updated before release.
- Do the cheap groundwork (Phase 0) while there is no real user data. Build the rest when the signals in section 7 appear.

## 2. Backend and login

| | Supabase | Dexie Cloud | Firebase |
|---|---|---|---|
| Where data lives | Region chosen per project (Frankfurt, among others) | Hosted service in Azure US East; EU only when self-hosted (licence €3,495 once) | Authentication runs in the US |
| Fit with this code | Write a sync layer on top of Dexie (about a week) | Made for Dexie, least code | Adds Firestore's own offline cache next to Dexie |
| Cost at 10,000 users | about $25 to $60 a month | €0.12 per user per month, about €1,200 | not costed |

**Supabase**: Dexie Cloud fits the code best, but its hosted service keeps data in the US and the per-user price grows fast. Firebase fails the EU requirement for login data. Supabase gives Postgres, login and file storage, offers a data processing agreement and encrypts data at rest. Lock-in is low: the server side is one table and one bucket.

**Login**

- **Email code** (`signInWithOtp`, then `verifyOtp({ type: 'email' })`): the same flow in the web app, iOS and Android, with no deep links.
- **Not magic links**: on iPhone a link opens Safari, whose storage is separate from the home-screen app, and the native apps would need universal links.
- **Own mail provider needed**: Supabase's built-in mailer is for testing only (a few emails an hour, team addresses only). Use an EU provider such as Brevo or Mailjet, with SPF and DKIM on wearwellapp.com, and a bilingual (Polish/English) email.
- **Sign in with Apple later**: a native plugin plus `signInWithIdToken`. Adding Google forces Apple too, and Apple then requires revoking tokens when an account is deleted.

## 3. Sync design

**Synced**: items (including wishlist and placeholder pieces), wears, outfits, photos, and these settings: `currency`, `vintedCountry`, `listingLanguage`, `nudgesEnabled`, `nudgeDays`, `targetCpw`, `coolingOff`.

**Never synced**:

- records with `sample: true`
- `deviceId` (per phone, used for the scan limit)
- `aiConsentAt` (asked once per device; cleaner evidence of consent)
- `reminder` (the notification is scheduled per device)
- `onboarded` and `rediscovery` (daily, per-device state)
- `lastBackupAt`, `backupReminderSnoozedUntil` and `homeScreenTipDismissed` (about this device's own backup and browser)
- the background remover's model cache (`wearwell-models` database)

**Server** (`supabase/migrations/001_sync.sql`):

```sql
records(user_id uuid references auth.users on delete cascade,
        kind text,            -- item | wear | outfit | prefs
        id text, data jsonb, updated_at timestamptz,
        deleted_at timestamptz, seq bigint,
        primary key (user_id, kind, id));
index on (user_id, seq)
```

Row-level security limits every user to their own rows. All writes go through one database function, `push_changes(rows jsonb)`, which:

- takes a per-user lock (`pg_advisory_xact_lock`), so the `seq` order matches the commit order
- caps `updated_at` at server time plus 2 minutes
- only saves a row whose `updated_at` is newer than the stored one, and stamps `seq = nextval(...)`
- rejects sample records and oversized payloads
- returns the server's copy of any rejected row

Because `data` is an opaque blob, app schema changes need no server migration, and end-to-end encryption could later swap it for ciphertext.

**Change tracking** (Dexie version 2, `src/data/db.ts`):

- A sparse `dirty` index on items, wears, outfits and photos, plus a new `syncState` table (`userId`, `cursor`, `lastSyncAt`, `serverOffsetMs`).
- Dexie `creating`/`updating` hooks set `dirty: 1` on every write to a non-sample record, so every write function (today's and future ones) is covered without editing each. Writes applied by sync run in a tagged transaction the hooks skip.
- The upgrade marks existing non-sample records dirty and re-keys the wears.
- After a push, `dirty` is cleared only if `updatedAt` has not changed meanwhile, so an edit made during the push is not lost. `createBackup` strips the field.

**Is "newest record wins" enough?** Yes. It is one person on two devices, so editing the same piece on both while offline is rare, and losing one of those edits is acceptable.

**Three fixes the code needed first** (done in Phase 0):

- **Wear ids**: `logWear` in `src/data/wears.ts` already keeps one wear per piece per day on one device, but gives each new wear a random id (`newId()`). The same piece logged for the same day on two offline devices becomes two records, and `listWears` counts both. Fix: a `wearId(itemId, date)` function in `src/domain/ids.ts`, used by `wears.ts`, `importer.ts`, `sample.ts` and backup restore.
- **Settings timestamp**: `updateSettings` in `src/data/settings.ts` bumps `updatedAt` on every change, including the daily "Not today" tap on the rediscovery card. That tap would overwrite preferences changed on the other device. Fix: a separate `prefsUpdatedAt`, set only when a synced setting changes.
- **Photo clean-up**: `purgeDeletedPhotos` in `src/data/items.ts` clears `photoId` without bumping `updatedAt`, so the change would never sync.

**Protocol (pull first, then push)**:

- **Pull**: rows with `seq` above the cursor, in `seq` order, 1,000 at a time. Apply each unless the local copy is dirty and newer.
- **Push**: dirty records, 200 at a time; a photo is uploaded before the item that points to it.
- **When**: app start, resume (Capacitor App event or `visibilitychange`), the `online` event, 3 seconds after a local write, and every 5 minutes while visible. Web Locks make sure only one sync runs, even with several tabs open.
- **Clock skew**: the server caps future timestamps, every response carries server time, and `nowIso()` applies the measured offset. Wear dates are local calendar days, so they are not affected.
- **Offline queue**: the dirty records are the queue; nothing else is needed.
- **Tombstones**: kept, they are tiny.

**Photos**:

- Private bucket, path `{userId}/{photoId}`, readable only by its owner. Allow WebP, JPEG and **PNG** (cutouts are saved as PNG on iPhone, because Safari cannot write WebP), with a size cap set after measuring real cutouts (start at 2 MB).
- Photos never change: replacing one creates a new id (`ItemEditorScreen.tsx`), so there are no conflicts and no photo rows in `records`.
- Other devices learn about a photo through `item.photoId` and download missing ones in the background, 3 at a time. `ItemThumb` already shows the category icon until a photo arrives.
- Once a week a device deletes bucket files older than 7 days that no live item (or item deleted in the last 30 days) uses, mirroring `purgeDeletedPhotos`.
- Size for planning: about 100 KB for an 800px WebP (a cutout measured 89 KB as WebP); PNG cutouts will be larger. Measure before fixing prices.

**First sign-in**:

- Device has data, account empty: upload everything.
- Device empty or only the sample wardrobe, account has data: download everything and offer to remove the sample.
- Both have data: a dialog with counts and two choices. **Merge** (default) combines everything, the newer copy winning where a record exists on both sides. **Use the account's wardrobe on this device** offers "Export backup" first. Warn that two wardrobes built separately will contain duplicates, especially quick-count placeholders.
- Settings: the account's preferences win if it has any.
- Importing a backup while signed in means "replace everywhere": restamp restored records with the current time, mark records missing from the file as deleted, then push.

**Signing out** asks "Keep a copy on this device" (default) or "Remove from this device" (for a shared laptop), clears the session and cursor, and marks all records dirty again. "Erase everything" while signed in signs out and clears the device; it does not touch the account.

**Deleting the account**: Settings, Account, Delete account calls `DELETE api/account.ts` (logic in `server/accountDelete.ts`, like `scanHandler.ts`). It checks the login token, removes `photos/{userId}/*`, then deletes the user, which deletes their `records` rows. Pin the Vercel functions to `fra1` (Frankfurt) in `vercel.json`. Afterwards, ask whether to keep the data on the device.

**Files that change**:

- Data layer: `db.ts`, `wears.ts`, `items.ts`, `settings.ts`, `importer.ts`, `sample.ts`, `backup.ts`, `index.ts`, `hooks.ts` (adds `useSyncStatus`)
- Domain: `ids.ts`, `types.ts`
- New `src/sync/`: `remote.ts` (Supabase client, loaded only after sign-in), `engine.ts`, `photos.ts`, `firstSignIn.ts`, with tests on `fake-indexeddb` (already installed)
- Screens and text: `SettingsScreen.tsx` (an Account section above "Your data"), new `SignInSheet.tsx`, `en.ts`, `main.tsx`
- Server: `api/account.ts`, `server/accountDelete.ts`, `vercel.json`
- Web: `vite.config.ts` (deletion page in the service worker's deny list), `public/privacy.html`, new `public/delete-account.html`
- `supabase/migrations/` and the README

## 4. Privacy, GDPR and the stores

- **Roles**: Polska Picks is the controller; Supabase and the mail provider are processors, so sign both data processing agreements (Supabase's is at supabase.com/legal/dpa). Supabase is a US company relying on Standard Contractual Clauses; review its sub-processors. Legal basis: contract (GDPR Art. 6(1)(b)).
- **`privacy.html`**: rewrite the "short version" summary, the meta description and "Deleting your data"; add an "Optional account" section (what is stored, where, how long, processors, rights, the right to complain to UODO). The "Changes" section promises the page is updated first, and the sign-up screen must explain what is uploaded before anything leaves the device. The contact email is needed by then.
- **App text**: "No account needed" stays true. The Settings privacy line needs a signed-out version and a signed-in one ("Backed up to your account, stored in the EU").
- **App Store label**: Contact Info (email), User Content (photos, other content) and Identifiers (user ID), all linked to the user, for app functionality, no tracking.
- **Google Play data safety**: email, photos, other user content; encrypted in transit; deletion offered, with the web link `wearwellapp.com/delete-account.html`.
- **Export**: the existing "Export backup" already covers data portability, because a signed-in device holds a full copy.
- **Encryption**: in transit (TLS) and at rest (AES-256).
- **End-to-end encryption: no for v1.** Sync is mostly for recovering after a lost phone or a reinstall. With email-code login, end-to-end encryption needs a separate passphrase or recovery key, and losing it loses the backup: exactly what sync should prevent. The data is fairly low-sensitivity (clothes, prices, dates). Say plainly in the policy that Polska Picks could technically access it and only does so when someone asks for help.

## 5. Costs

**Supabase** (pricing page, 25 October 2026, before VAT):

- **Free**: $0. 500 MB database, 1 GB files, 5 GB egress, 50,000 monthly active users. Pauses after a week of inactivity; no backups.
- **Pro**: from $25 a month. 8 GB database (then $0.125/GB), 100 GB files (then $0.0213/GB), 250 GB egress (then $0.09/GB), 100,000 monthly active users, $10 compute credit (one Micro instance), daily backups kept 7 days.

**Planning assumptions** (estimates, not measured): about 1 MB of database per active user per year, about 10 MB of photos per wardrobe, about 5 MB of downloads per user per month, and a few code emails per user per year.

| Active users | Files / database / egress | Supabase | Email | Total |
|---|---|---|---|---|
| 0 | none | Free, $0 | free tier | $0 |
| 100 | 1 GB / 0.1 GB / 0.5 GB | Pro, $25 (Free's 1 GB of files would be full, and it pauses) | free tier (to verify) | about $25 |
| 1,000 | 10 GB / 1 GB / 5 GB | Pro, $25 | free tier (to verify) | about $25 |
| 10,000 | about 100 GB / 10 GB / 50 GB | $25 plus small overages; maybe a bigger instance (to verify) | paid tier (to verify) | about $30 to $60 (to verify) |

Fixed costs do not change: Apple $99 a year, Google Play $25 once. Separately, check whether Vercel's Hobby plan (non-commercial use) fits WearWell; that applies with or without sync.

## 6. Build plan

- **Phase 0, done 25 October 2026**: fixed wear ids and the Dexie v2 re-key, `prefsUpdatedAt`, the `purgeDeletedPhotos` fix. The clock-offset hook in `nowIso()` moved to Phase 2, since it needs the server's time.
- **Phase 1, 2 to 3 days**: Supabase project, migration, row-level security, `push_changes`, bucket, mail provider, email templates, database tests.
- **Phase 2, 5 to 7 days**: sync engine, Dexie hooks, photo upload and download, triggers. Tests with two simulated devices, clock skew, offline edits and an interrupted push.
- **Phase 3, 3 to 4 days**: account screens, first sign-in dialog, sign-out, deletion endpoint and page, texts.
- **Phase 4, 2 to 3 days plus store review**: privacy page, store labels, agreements, README; testing on iPhone (home-screen app and Safari), Android Chrome, both native apps and a reinstall; then TestFlight and the Play closed test.
- **Total**: about 13 to 18 working days.

**Risks**:

- **Data loss from a sync bug** (the biggest): a push never hard-deletes, only marks deleted; offer "Export backup" before any merge.
- **Duplicates** after merging two wardrobes built separately: the warning in the merge dialog.
- **Code emails in spam**: SPF and DKIM on the own domain.
- **Abuse and runaway costs**: bucket limits, a per-user record cap, Supabase's spend cap left on.
- **Supabase backups do not include stored files**: devices keep full copies of the photos.
- **Diluting "no account needed"**: sync off by default, that line kept prominent.

**Decisions for you (my recommendation)**:

1. Supabase in Frankfurt? **Yes.**
2. Email code only at launch? **Yes.**
3. End-to-end encryption? **No for v1.**
4. Default when signing out? **Keep the data on the device.**
5. Do Phase 0 now? **Done.**
6. Sync free or paid? **Free during beta**; revisit at about 1,000 accounts.
7. Inactive accounts? **Keep until the person deletes them**; revisit at 1,000 accounts.

## 7. Signals that it is worth building

- People still logging wears after 4 weeks or more (they have something to lose). With no analytics, this comes from feedback emails and store reviews.
- Unprompted requests, for example 5 to 10 people asking for laptop access, a new phone, or saying they lost their wardrobe.
- Data-loss reports after reinstalls, or iOS clearing Safari's site data.
- The store apps are live and stable, or a paid tier is planned that sync could belong to.

Until then, a monthly "Export a backup" reminder covers most of the reinstall risk at no cost and keeps the "nothing leaves your phone" promise.

Sources: [Supabase pricing](https://supabase.com/pricing), [Supabase regions](https://supabase.com/docs/guides/platform/regions), [Supabase backups](https://supabase.com/docs/guides/platform/backups), [Supabase security](https://supabase.com/security), [Dexie Cloud pricing](https://dexie.org/pricing), [Dexie Cloud GDPR](https://dexie.org/docs/cloud/gdpr-compliance), [Firebase privacy](https://firebase.google.com/support/privacy), [Apple review guidelines](https://developer.apple.com/app-store/review/guidelines/), [Google Play account deletion](https://support.google.com/googleplay/android-developer/answer/13327111), [Brevo Supabase SMTP guide](https://developers.brevo.com/docs/supabase-smtp-integration)
