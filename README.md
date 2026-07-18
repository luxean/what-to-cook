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

## Supabase setup and migrations

1. Create a free Supabase project.
2. Install project dependencies with `npm install`. The Supabase CLI is pinned as a local development dependency, so no global installation is needed.
3. Authenticate and link this repository to the remote project using the local CLI:

   ```bash
   npx supabase login
   npx supabase link --project-ref YOUR_PROJECT_REFERENCE
   ```

   The reference is the subdomain from `https://YOUR_PROJECT_REFERENCE.supabase.co`. Linking may ask for the database password chosen when the project was created.

4. Apply all committed migrations:

   ```bash
   npx supabase db push
   ```

5. Confirm that `app_data` appears under Supabase **Table Editor**. Copy `.env.example` to `.env.local` for local API testing and fill in the server values. Do not commit this file.

The CLI records applied migrations in the remote database, so `db push` applies only files that have not run yet. Do not edit a migration after it has been applied. For a future schema change, create and commit a new one:

```bash
npx supabase migration new add_meal_notes
# edit the new file in supabase/migrations/
npx supabase db push
```

Review migration SQL before pushing it. Keep destructive changes, such as dropping a column, in their own clearly named migration and back up important data first.

## GitLab and Vercel deployment

1. Create a private project in your personal GitLab namespace and push this directory to its `main` branch.
2. In Vercel, select **Add New → Project**, connect GitLab, and import the repository.
3. Add the five values below under Vercel **Project → Settings → Environment Variables**. Enable at least **Production** for each value.
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

Store that output as `SESSION_SECRET`. `SUPABASE_SECRET_KEY`, `APP_PASSCODE_HASH`, and `SESSION_SECRET` are server-only and must **not** start with `VITE_`. Only `VITE_CLOUD_ENABLED=true` is public.

### Exact Supabase values

In Supabase, open **Project Settings → API Keys** (or the project's **Connect** dialog):

- `SUPABASE_URL`: the project URL, shaped like `https://abcdefgh.supabase.co`.
- `SUPABASE_SECRET_KEY`: create/copy a **Secret key** beginning with `sb_secret_`. Do not use the publishable key. The legacy `service_role` key also works, but the current secret key is preferred.

The secret key is intentionally used only by the Vercel `/api` functions. It never enters the Vite browser bundle. After adding or changing Vercel variables, trigger a new deployment from **Deployments → Redeploy**.
