# Brillianda front end

Brillianda v1 is a self-serve school registry (docs/plan.md, the source of truth). This repo is the
**front end only**. A teammate owns the backend: database, row-level security, Better Auth,
`proxy.ts` and the internals of Server Actions. We are moving today's Vite app (`legacy/`) onto the
plan's stack batch by batch (docs/migration-plan.md), keeping its look and behaviour exactly.

## Commands

- `pnpm install` once; `pnpm dev` runs the app at http://localhost:3000
- `/dev` (development only) is the playground: the app shell, every shared component, and the
  list patterns on sample students. Check changes to `packages/ui` there.
- `pnpm test` (Vitest in packages), `pnpm typecheck`, `pnpm lint`, `pnpm build`
- `pnpm e2e` builds the app and runs Playwright against it on port 3100, at 360 and 1280 px.
  Locally, set `PW_CHROMIUM` to a Chromium path to skip the browser download.
- `legacy/`: the old app, its own npm install: `cd legacy && npm ci && npm run dev` (5173 app, 5174 site)

## What each package owns

- `apps/web`: Next.js 16 App Router with two root layouts. `src/app/(marketing)` is brillianda.com
  (the old site, with its own CSS); `src/app/(app)` is everything in our app design: signup,
  `/login`, `s/[school]` for every page on a school's subdomain, and the `/dev` playground.
  `src/data` is the data layer (below).
- `packages/core`: pure TypeScript shared by browser and server: Zod schemas, generators, rules. No React, no I/O.
- `packages/ui`: our components (our look on shadcn/ui) and the four responsive patterns:
  DataList, ResponsiveDialog, FilterSheet, ActionBar.
- `packages/config`: shared tsconfig.
- `e2e`: Playwright flows.
- Not ours: `packages/db`, `packages/auth`, `packages/email` (backend teammate).

## Rules

- **Front end only.** Never write database schemas, migrations, RLS policies, auth config or
  server internals, and never start Docker.
- **The data layer is the seam.** Screens read and write only through functions in `apps/web/src/data`.
  Each one has a clearly marked fake implementation in `src/data/fake` that the backend teammate replaces.
  Every function and its schema is listed in docs/data-contract.md; keep that file current.
- **Zod schemas live in `packages/core`**, so the browser and the server check the same thing.
- **Look exactly the same.** A moved screen is screenshotted at 360 and 1280 px and compared with
  `docs/look-book` before its batch is done. Planned differences are listed in docs/migration-plan.md.
- **Phone first:** design at 360 px, 44 px touch targets, 16 px inputs, the right keyboard per field,
  every empty state says what to do next, nothing depends on hover.
- **Colours come from tokens only** (`apps/web/src/styles/tokens.css`), so Pastel, Neutral and a
  school's brand colour all work.
- Ask before adding a dependency.
- The product name is **Brillianda** (the old code says Brillanda).

## Gotchas

- **Next.js 16 differs from older versions.** Read `apps/web/node_modules/next/dist/docs/` before
  writing Next-specific code (routing, caching, fonts, Server Actions).
- `cacheComponents` is on: request-time data needs a Suspense boundary; read the caching docs.
- `proxy.ts` (renamed middleware) maps `surebloom.brillianda.com` to `/s/surebloom`. It is the
  backend teammate's; in development open `/s/<school>/…` directly.
- Tailwind v4 runs through `@tailwindcss/turbopack`; theme tokens are in CSS (`@theme`), not a JS config.
  Workspace packages need an `@source` line so their classes are found.
- `legacy/` is outside the pnpm workspace on purpose. Don't import from it; copy what moves.
- Screens use `AppShell` from `apps/web/src/components/shell`. The look (Pastel or Neutral) lives in
  `src/lib/look.ts`; the `<head>` script in the root layout applies it before first paint.
- Browser tests wait for `<html data-hydrated>` (set by `components/Hydrated.tsx`) through
  `open()` in `e2e/tests/helpers.ts`. Don't use `waitUntil: "networkidle"`: Chrome's cached
  prefetches can keep it waiting forever.
- Anything that reads the clock in a Server Component needs `await connection()` (or a read of
  cookies) before it, or Next 16 refuses to prerender.
- `packages/ui` exports through `src/index.ts`. Interactive files start with "use client", so the
  barrel is safe to import from Server Components.
