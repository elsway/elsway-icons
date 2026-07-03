# Elsway Icons CMS — Setup Checklist

## 1. Supabase project (free tier)

1. Go to https://supabase.com → **New project**.
2. Copy the **Project URL** and **anon public key** from Project Settings → API.
3. Also copy the **service_role secret** (used only by the migration script; never expose to the client).

## 2. Storage bucket

Storage → Create bucket:
- Name: **`elsway-icons`**
- Public: **yes** (icons are served from the CDN URL)
- File size limit: 1 MB

Storage → Policies → New policy on `elsway-icons`:
- **Read**: for all — `bucket_id = 'elsway-icons'`
- **Insert / Update / Delete**: role `authenticated` — `bucket_id = 'elsway-icons' AND auth.jwt() ->> 'email' LIKE '%@cars24.com'`
  (or use the SQL blocks in `supabase/schema.sql`).

## 3. Database schema

Open SQL Editor → paste and run `supabase/schema.sql`. Creates the `icons` table with RLS policies restricting writes to `@cars24.com` accounts.

## 4. Google SSO

Authentication → Providers → Google → Enable.
- In Google Cloud Console, create an OAuth 2.0 Client ID (Web application).
- Authorized redirect URI: `https://<PROJECT_REF>.supabase.co/auth/v1/callback`
- Optional: set **allowed hosted domain = cars24.com** in the Supabase provider settings (or leave the client-side hint alone — the app also checks the email domain).
- Paste the Google client ID + secret into Supabase.

## 5. Local dev

1. Copy `.env.example` → `.env.local`.
2. Fill `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
3. `pnpm dev` → visit `/elsway-icons/` → sidebar shows a working **Sign in** button; visit `/elsway-icons/admin` for the CMS.

## 6. Vercel

Project Settings → Environment Variables → add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` for Production & Preview. Redeploy.

## 7. One-time migration: upload existing 14k SVGs

```
export SUPABASE_URL="https://<project>.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="<service_role>"
node scripts/supabase-migrate.mjs
```

The script uploads every existing SVG to the bucket and populates the `icons` metadata rows with the categories extracted from Figma. ~14,020 objects; runs in ~5 min on a decent connection.

## 8. Point the icon grid at Supabase (optional)

The frontend currently loads SVGs from the static Vercel build (`/raw/elsway/...`). To switch it to Supabase (so CMS edits appear immediately without redeploying):

1. Open `src/components/IconGrid/IconGridItem.tsx` and `src/components/IconGrid/Panel.tsx`.
2. Replace the hardcoded `` `${BASE}raw/elsway/${brand}/${weightFolder}/${name}.svg` `` with `iconUrl(brand, weight, name)` imported from `@/lib/supabase`.
3. Same for the manifest — instead of the bundled JSON, fetch the current icon list from the `icons` table on mount.

Alternatively, leave the public grid pointing at the static bundle and only use Supabase for edits — the next Vercel deploy picks up any repo-synced changes.
