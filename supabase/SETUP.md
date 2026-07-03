# Elsway Icons CMS — Setup Checklist

Architecture: icons stay in this **GitHub repo** as SVG files (single source of truth). The CMS mutates them by calling a Vercel serverless function (`/api/cms`) that commits changes through the GitHub API. Auth is Google SSO via Supabase (free tier — used only for auth).

```
Browser  →  Supabase Auth (Google SSO)  →  session JWT
Browser  →  /api/cms  (Vercel Edge Function)
                       │ verifies JWT + @cars24.com email
                       ▼
             GitHub API  →  commits SVG changes  →  main branch
                                                    │
                                                    ▼
                                             Vercel auto-deploy
```

## 1. Supabase project (auth only, free tier)

1. Go to https://supabase.com → **New project**.
2. Project Settings → API → copy **Project URL** and **anon public key**.

## 2. Google SSO

Supabase → Authentication → Providers → Google → **Enable**.
- In Google Cloud Console, create an OAuth 2.0 Web Client.
- Authorized redirect URI: `https://<PROJECT_REF>.supabase.co/auth/v1/callback`
- Paste client ID + secret into Supabase.
- The app also checks the caller's email domain — only `@cars24.com` accounts can write.

## 3. GitHub PAT (for the write proxy)

Create a **fine-grained** personal access token on the elsway account:
- Repository access: **elsway/elsway-icons** only.
- Permissions: **Contents = read/write**.
- Expiration: whatever you're comfortable with.

## 4. Vercel env vars

Project Settings → Environment Variables (Production + Preview):

| Name | Example |
|---|---|
| `VITE_SUPABASE_URL` | `https://xyz.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | `eyJ…` (anon public) |
| `SUPABASE_URL` | same as above (server side) |
| `SUPABASE_ANON_KEY` | same as above (server side) |
| `GITHUB_TOKEN` | `github_pat_…` (fine-grained PAT) |
| `GITHUB_REPO` | `elsway/elsway-icons` |
| `GITHUB_BRANCH` | `main` |
| `ALLOWED_EMAIL_DOMAIN` | `cars24.com` |

Redeploy.

## 5. Local dev

1. Copy `.env.example` → `.env.local`. Fill `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`.
2. `pnpm dev` → sidebar shows a working **Sign in** button.
3. Local dev does **not** hit the Vercel function; the CMS write ops will 404 locally. Point local testing at a preview deployment (or run `vercel dev`).

## 6. Try it

- Visit `/elsway-icons/` → click **Sign in** in the sidebar → complete Google flow → sidebar switches to "Open CMS".
- `/elsway-icons/admin` → search, edit tags/categories, replace SVGs, add new icons.
- Every mutation lands as a git commit authored by your email — auditable in the repo history. Vercel picks it up and redeploys the site in ~1 min.

## Notes

- **Metadata** (categories, tags) lives in `public/raw/elsway/metadata.json` — a single JSON keyed by icon slug — kept versioned alongside the SVGs. It's created on first edit.
- **Add-new mandates** all 5 brands × 2 weights = 10 SVGs before the button unlocks. All 10 land in a single commit.
- **Renames** move 10 objects in individual commits (one per file, since GitHub Contents API rewrites atomically per path).
- **Deletes** land in one commit (batch).
