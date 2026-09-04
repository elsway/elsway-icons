# Autonaut Icons — Setup Guide

This is the up-to-date guide for using and administering Autonaut Icons. It replaces the earlier Supabase/Google-SSO version of this doc, which described a design that was never shipped — the live site uses **GitHub as both the icon store and the sign-in provider**. No Supabase, no separate database, no third-party auth service.

- **Live site:** https://autonaut-icons.vercel.app
- **Source repo:** https://github.com/elsway/elsway-icons (default branch `main`)

---

## Part 1 — Using the site (everyone)

No account or setup needed to browse.

1. Open the live site.
2. Pick a **brand** from the dropdown in the left sidebar — `Default`, `Cars24`, `CarInfo`, `TeamBHP`, `VehicleInfo`. Each brand renders the same icon set with a different corner treatment.
3. Pick a **weight** (`Regular` / `Fill`) and adjust size with the slider at the top.
4. Search or browse by category in the left sidebar. Category counts update live.
5. Click any icon to open its detail panel — copy the raw SVG, or grab a React/Web/Vue/Flutter/Elm/Swift snippet from the tabs.

That's the whole read path. 1,402 icons × 5 brands × 2 weights, all static files, nothing to configure.

## Part 2 — Getting edit access (CMS)

Editing (renaming an icon, changing its tags/categories, replacing its SVGs, adding a new icon, or deleting one) requires being a **collaborator with write access** on the `elsway/elsway-icons` GitHub repo. There is no separate CMS login or password — your GitHub identity *is* the CMS identity.

**To request access:** ask whoever administers the `elsway` GitHub org to add your GitHub account as a collaborator on `elsway/elsway-icons` with **Write** permission (Settings → Collaborators and teams, on the repo).

**Once you have access:**

1. On the live site, click **Sign in with GitHub** at the bottom of the left sidebar.
2. A popup opens GitHub's normal OAuth consent screen. Approve it.
3. The sidebar switches to show your GitHub username and **"CMS ACTIVE — edit icons in place."** (If it instead says you're signed in but not a collaborator, your account doesn't have write access yet — go back to the request-access step above.)
4. Click any icon → its detail panel now has an **"Edit this icon"** button, which opens a full editor: rename, edit categories/tags, and replace the SVG for each of the 5 brands × 2 weights independently.
5. To add a brand-new icon, use the **"+ New icon"** button in the header (requires all 10 brand × weight SVGs uploaded before it unlocks).

Every save is a real git commit to `main`, authored as your GitHub account — fully auditable in the repo's commit history. Vercel auto-redeploys on push, so changes go live in roughly a minute.

---

## Part 3 — Administering / redeploying the platform

This section is only relevant if you're setting up a **new** deployment of this app (a fork, or recovering from a lost Vercel project) — not for day-to-day use or granting access, which are covered above.

### Architecture

```
Browser → GitHub OAuth "Login with GitHub" (popup)
             │  redirects to /api/github-callback?code=…
             ▼
   /api/github-callback (Vercel Edge Function)
             │  exchanges code + GITHUB_CLIENT_SECRET for an access token
             │  postMessage()s the token back to the popup's opener, then closes
             ▼
   Browser stores the token (localStorage), calls GitHub REST/Git Data API directly
   to check collaborator permission and to read/write SVGs + metadata.json
             │
             ▼
   GitHub repo (main branch) ──▶ Vercel auto-deploy
```

No database. No server-side session store. The repo is the database; GitHub's own collaborator permissions are the access control.

### 1. Create a GitHub OAuth App

GitHub → Settings → Developer settings → OAuth Apps → **New OAuth App**, on the account/org that owns the repo (currently `elsway`):

| Field | Value |
|---|---|
| Homepage URL | `https://autonaut-icons.vercel.app` |
| Authorization callback URL | `https://autonaut-icons.vercel.app/api/github-callback` |

Save it, then generate a **client secret**. You'll get a **Client ID** (~20 chars) and a **Client Secret** (~40 chars) — don't mix them up in the next step, they're easy to paste into the wrong field.

### 2. Vercel environment variables

Project Settings → Environment Variables (scope: Production **and** Preview):

| Name | Value | Notes |
|---|---|---|
| `VITE_GITHUB_CLIENT_ID` | the OAuth App's Client ID | exposed to the browser — safe, it's not a secret |
| `GITHUB_CLIENT_SECRET` | the OAuth App's Client Secret | server-only, used only inside `/api/github-callback` |
| `VITE_GITHUB_REPO` | `elsway/elsway-icons` | optional — this is the default if unset |
| `VITE_GITHUB_BRANCH` | `main` | optional — this is the default if unset |

After adding or changing any of these, **redeploy with "Use existing Build Cache" unchecked** — Vercel does not always pick up new env vars on a cached rebuild.

To sanity-check what Vercel actually sees without exposing values, hit `/api/env-debug` on the deployment — it reports which vars are present and their lengths (useful for catching a Client ID accidentally pasted into the secret field: 20 chars vs. the expected 40).

### 3. Local dev

```bash
pnpm install
cp .env.example .env.local   # fill in VITE_GITHUB_CLIENT_ID if you want sign-in to work locally
pnpm dev
```

Local dev talks to GitHub's real OAuth endpoints and the real repo — there's no local mock. If you don't set `VITE_GITHUB_CLIENT_ID`, the site still works fully read-only (`CMS_CONFIGURED` is `false` and the sidebar shows "CMS setup pending" instead of a sign-in button).

The OAuth callback (`/api/github-callback`) is a Vercel Edge Function — it won't run under plain `vite dev`. Either run `vercel dev` locally, or just test sign-in against a Vercel preview deployment.

### Notes on the data model

- **Icons**: `public/raw/elsway/{brand}/{weight}/{name}.svg` — 5 brands × 2 weights × 1,402 names.
- **Categories**: `public/raw/elsway/categories.json` — name → category list, extracted from the source Figma frame names at migration time.
- **Manifest**: `public/raw/elsway/manifest.json` — the full list of 1,402 icon names; this is what the app's icon grid is built from (not any npm icon catalog).
- **CMS overrides**: `public/raw/elsway/metadata.json` — category/tag edits made through the CMS. Created on first edit, versioned alongside the SVGs.
- **Add-new** requires all 10 brand × weight SVGs before the button unlocks; they land in a single commit.
- **Rename** moves each of the 10 files individually (GitHub's Contents API rewrites one path per call).
- **Delete** removes all 10 files in a single batch commit.
