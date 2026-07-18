# Čo navariť?

Mobile-first Slovak PWA that suggests meals based on how often they are cooked, how long ago they were last cooked, and recent rejections.

## Run locally

```bash
npm install
npm run dev
```

Tests and production build:

```bash
npm test
npm run build
```

## Data and recommendation

Data is cached in the browser for offline use. In cloud mode, a household passcode unlocks a server-side API and the cache synchronizes to Supabase. The browser receives only a signed, HTTP-only session cookie; it never receives the configured passcode or the Supabase service key. Without cloud variables, the app remains fully functional in local-only mode.

The score in `src/recommender.ts` combines:

- logarithmic favorite score (frequent meals get a boost without taking over),
- capped time-since-cooked score,
- exploration boost for never-cooked meals,
- a rejection penalty that fades over 14 days.

The app draws from the five highest-scoring meals with weighted randomness, so it stays varied.

## Supabase setup

1. Create a free Supabase project.
2. Open **SQL Editor**, paste [`supabase/schema.sql`](supabase/schema.sql), and run it once.
3. Copy `.env.example` to `.env.local` for local API testing and fill in the server values. Do not commit this file.

## GitLab and Vercel deployment

1. Create a private project in your personal GitLab namespace and push this directory to its `main` branch.
2. In Vercel, select **Add New → Project**, connect GitLab, and import the repository.
3. Add the five values shown in `.env.example` under Vercel **Environment Variables** for Production and Preview.
4. Deploy. `vercel.json` already selects the build command, `dist` directory, and SPA routing.
5. No Supabase authentication or redirect URL setup is required.

Every push to `main` now deploys production automatically. Other branches receive preview URLs. The generated URL can be added to an Android or iPhone home screen and opens like an app.

## Important operational notes

- Supabase Free projects may pause after a week without use; the first visit afterward can be slower while it wakes.
- Local storage keeps the UI useful through temporary network loss. Pending changes synchronize when React next observes a change after connectivity returns; a dedicated conflict-resolution queue would be the next hardening step for simultaneous multi-device editing.
- The household code creates a 30-day login, so your mom normally enters it only once per device.

## Generate the secrets

Choose a code that is at least 6–8 digits (or, better, several memorable words). Generate its SHA-256 hash locally—do not paste the code itself into Vercel:

```bash
node -e "const c=require('node:crypto'); process.stdout.write(c.createHash('sha256').update(process.argv[1]).digest('hex')+'\\n')" 'YOUR-PASSCODE'
```

Store the output as `APP_PASSCODE_HASH`. Generate the independent cookie-signing secret with:

```bash
openssl rand -hex 32
```

Store that output as `SESSION_SECRET`. `SUPABASE_SERVICE_ROLE_KEY`, `APP_PASSCODE_HASH`, and `SESSION_SECRET` are server-only and must **not** start with `VITE_`. Only `VITE_CLOUD_ENABLED=true` is public.
