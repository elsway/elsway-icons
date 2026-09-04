# Autonaut Icons

A 1,402-icon library, browsable and searchable in one grid, that ships in 5 brand skins and 2 weights — with a built-in CMS so anyone with write access to this repo can edit, rename, or replace an icon directly from the browser. No separate admin app, no third-party database: this GitHub repo is both the icon store and the CMS backend.

- **1,402 icons** across **5 brands** (Default, Cars24, CarInfo, TeamBHP, VehicleInfo) and **2 weights** (Regular, Fill)
- Live at **https://autonaut-icons.vercel.app**
- Icons are plain SVG files under `public/raw/elsway/{brand}/{weight}/{name}.svg` — no build step, no npm package, no font required to use them
- Edits go through GitHub sign-in and land as real git commits

## Using it

See **[CMS-SETUP.md](CMS-SETUP.md)** for the full guide:

- **Browsing** — anyone, no account needed: search, switch brand/weight, copy SVG or a framework snippet.
- **Editing** — requires GitHub write access to this repo. Sign in with GitHub on the site; your GitHub identity is the CMS identity, there's no separate login.
- **Administering / redeploying** — the OAuth App setup, Vercel env vars, and local dev instructions, for whoever manages the deployment.

## Local development

```bash
pnpm install
pnpm dev
```

The CMS sign-in flow needs `VITE_GITHUB_CLIENT_ID` set (see `.env.example` and CMS-SETUP.md) — without it the site still runs fully read-only.

## License

MIT
