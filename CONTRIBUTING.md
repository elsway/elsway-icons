# Contributing to Autonaut Icons

This is an internal Cars24/Elsway design-system tool, not a public open-source project — there's no external contribution funnel, funding page, or community-port ecosystem. If you have write access to this repo, you already have everything you need.

## Editing icons

Most day-to-day "contribution" here is editing icons through the CMS, not opening a PR. See **[CMS-SETUP.md](CMS-SETUP.md)** for:

- how to get GitHub write access to this repo,
- how to sign in and edit/rename/replace icons or add a new one through the live site.

## Reporting a bug or requesting an icon

Open an [issue](https://github.com/elsway/elsway-icons/issues/new/choose) on this repo using the bug report or icon request template. There's no dedicated security contact for this repo — for anything sensitive, message the team directly rather than filing a public issue.

## Code contributions

For changes to the app itself (not icon edits):

- Run `pnpm format` before submitting a PR — 2-space indent, double-quoted strings, trailing commas.
- Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/#specification): `<type>(<scope>): <message>`, e.g. `fix(cms): correct brand dropdown state`.
