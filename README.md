# Daymark Personal Planner

Daymark includes the original daily planner, monthly tracker, history, dark mode, task start/end times, and Budget page. It continues to save locally in IndexedDB and can optionally sync each signed-in user's data to Supabase.

## Run locally

```bash
npm install
npm run dev
```

## Enable accounts and cloud sync

1. Create a project at [Supabase](https://supabase.com/).
2. In the Supabase Dashboard, open **SQL Editor**, paste the contents of `supabase-schema.sql`, and run it. This creates the private per-user data table and Row Level Security policies.
3. Open **Project Settings → API**. Copy the Project URL and the publishable/anon key. Never use a `service_role` key in the browser.
4. Copy `.env.example` to `.env.local` and fill in:

   ```env
   VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
   VITE_SUPABASE_ANON_KEY=YOUR_PUBLISHABLE_OR_ANON_KEY
   ```

5. In Supabase **Authentication → URL Configuration**, set your local Site URL to `http://localhost:5173`. Add your deployed website URL to the Redirect URLs list as well.
6. Restart the Vite server after changing `.env.local`.
7. Create an account in Daymark. If email confirmation is enabled in Supabase, confirm the email before signing in.

When the first account signs in, existing local Daymark data is migrated to that account's cloud row. Later sign-ins load that account's own cloud data. Local data is retained in IndexedDB as a browser cache. Signing out does not delete cloud data.

## Deploy

Deploy the project to Vercel or another Vite-compatible host. Add the same two environment variables in the host's project settings, then redeploy. Add the deployed domain to Supabase Authentication's Site URL / Redirect URLs.

## Security notes

- The browser only receives the Supabase publishable/anon key; do not expose a service-role key.
- `supabase-schema.sql` enables Row Level Security and restricts each row to `auth.uid() = user_id`.
- Cloud data is stored as one JSONB record per authenticated user. For larger-scale production use, consider splitting planner records into normalized tables and adding conflict-aware multi-device merging.
- Keep using the JSON backup option in Settings as an additional backup.
