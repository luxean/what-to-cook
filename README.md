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

Data is cached in the browser for offline use. When Supabase variables are configured, passwordless email authentication is enabled and the cache synchronizes to a private per-user PostgreSQL table. Without those variables, the app remains fully functional in local-only mode.

The score in `src/recommender.ts` combines:

- logarithmic favorite score (frequent meals get a boost without taking over),
- capped time-since-cooked score,
- exploration boost for never-cooked meals,
- a rejection penalty that fades over 14 days.

The app draws from the five highest-scoring meals with weighted randomness, so it stays varied.

## Supabase setup

1. Create a free Supabase project.
2. Open **SQL Editor**, paste [`supabase/schema.sql`](supabase/schema.sql), and run it once.
3. In **Authentication → URL Configuration**, set the Site URL to the Vercel production URL. Add `http://localhost:5173` as a redirect URL for local testing.
4. Copy `.env.example` to `.env.local` and fill in the project URL and publishable/anon key from **Project Settings → API**.
5. Never use the `service_role` key in this frontend. The publishable anon key is expected to be public; row-level security protects the rows.

## GitLab and Vercel deployment

1. Create a private project in your personal GitLab namespace and push this directory to its `main` branch.
2. In Vercel, select **Add New → Project**, connect GitLab, and import the repository.
3. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` under **Environment Variables** for Production and Preview.
4. Deploy. `vercel.json` already selects the build command, `dist` directory, and SPA routing.
5. Copy the resulting Vercel URL into Supabase's **Site URL** and **Redirect URLs**, then redeploy once.

Every push to `main` now deploys production automatically. Other branches receive preview URLs. The generated URL can be added to an Android or iPhone home screen and opens like an app.

## Important operational notes

- Supabase Free projects may pause after a week without use; the first visit afterward can be slower while it wakes.
- Local storage keeps the UI useful through temporary network loss. Pending changes synchronize when React next observes a change after connectivity returns; a dedicated conflict-resolution queue would be the next hardening step for simultaneous multi-device editing.
- Email magic links remove the need for your mom to remember a password.
