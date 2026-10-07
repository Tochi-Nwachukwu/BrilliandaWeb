# Brillanda (front end)

School results & records management for Nigerian secondary schools: the marketing site and the
web app (school admin, teacher, parent and Brillanda team portals). The API lives in a separate
repository; until it serves every screen, the app runs on clearly marked sample data in the
browser (DECISIONS.md D-7).

- **Every deviation or open decision:** [DECISIONS.md](DECISIONS.md)
- **Design prototypes and drafts:** [design/](design/)

## Prerequisites

- Node.js 20.19+ (22 recommended)

## Run it

```sh
npm install
npm run dev          # landing site http://localhost:5174, app http://localhost:5173/login
```

Ctrl+C stops both. They are two separate projects (DECISIONS.md D-10), so each has its own port.
`npm run dev:web` or `npm run dev:site` starts just one.

### Sample data and sample accounts

The sign-in page offers one sample account per portal (password `brillanda`), plus
"New school (first run)", the admin of a brand-new school, which starts afresh at each sign-in.
Everything you change is kept in your browser's local storage. A "Sample data" badge shows in
the header whenever sample data is in use.

To call a real API for everything, set `VITE_USE_MOCKS=false` in `apps/web/.env.local`; requests
to `/api` are proxied to `http://localhost:4000`. Production builds never include sample data,
unless built as a demo with `VITE_DEMO=true` (D-17).

## Deploying to Vercel

The site and the app deploy together as **one Vercel project on one address**: the site at `/`,
the app at every other path (`/login`, `/portal`, `/admin`, …). Import the repo with the
**Root Directory left at the top** (`./`); the root `vercel.json` sets everything else.

`npm run build:vercel` (also works locally) builds both and combines them in `dist/`. The app is
built as a demo, with sample data and sample sign-in, until `VITE_DEMO=false` is set in the Vercel
project (do that once the API is deployed, then redeploy).

## Layout

```
apps/web               the app: React + Vite + Tailwind, one folder per portal
  src/portals/         admin · teacher · parent · super-admin
  src/shared/          components, layout, auth, theme, utilities
  src/mocks/           sample data and stand-in endpoints (removed as the API ships)
apps/site              the marketing site: plain HTML, CSS and TypeScript
packages/shared-types  API contracts and shared logic (grading, admission numbers, imports)
design/                prototypes, drafts and design patterns
scripts/               dev runner and the Vercel build
```

## Useful scripts

| Command | What it does |
|---|---|
| `npm test` | Run every test suite |
| `npm run typecheck` | Type-check every workspace |
| `npm run build:vercel` | Build the site and app as one deployable folder |
