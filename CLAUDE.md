# Brillianda front end

Brillianda v1 is a self-serve school registry (docs/plan.md, the source of truth). This repo is the
**front end only**. The backend team builds a separate API (their repo, brillanda-backend; see the
end of docs/data-contract.md). We moved the old Vite app onto the plan's stack batch by batch
(docs/migration-plan.md), keeping its look and behaviour. The old code is at the `vite-final` tag
and in the brillanda-v1 folder, for reference only.

## Commands

- `pnpm install` once; `pnpm dev` runs the app at http://localhost:3000
- `/dev` (development only) is the playground: the app shell, every shared component, and the
  list patterns on sample students. Check changes to `packages/ui` there.
- `pnpm test` (Vitest in packages), `pnpm typecheck`, `pnpm lint`, `pnpm build`
- `pnpm e2e` builds the app and runs Playwright against it on port 3100, at 360 and 1280 px.
  Locally, set `PW_CHROMIUM` to a Chromium path to skip the browser download.

## What each package owns

- The repo root is the Next.js 16 app (App Router, two root layouts), so Vercel deploys it with no
  settings. `src/app/(marketing)` is brillianda.com
  (the old site, with its own CSS); `src/app/(app)` is everything in our app design: signup,
  `/login`, `s/[school]` for every page on a school's subdomain, and the `/dev` playground.
  `src/data` is the data layer (below).
- `packages/core`: pure TypeScript shared by browser and server: Zod schemas, generators, rules. No React, no I/O.
- `packages/ui`: our components (our look on shadcn/ui) and the four responsive patterns:
  DataList, ResponsiveDialog, FilterSheet, ActionBar.
- `packages/config`: shared tsconfig.
- `e2e`: Playwright flows.
- Not ours: the database, auth and email live in the backend repo.

## Rules

- **Front end only.** Never write database schemas, migrations, RLS policies, auth config or
  server internals, and never start Docker.
- **The data layer is the seam.** Screens read and write only through functions in `src/data`.
  Each one has a clearly marked fake implementation in `src/data/fake` that the backend teammate replaces.
  Every function and its schema is listed in docs/data-contract.md; keep that file current.
- **Zod schemas live in `packages/core`**, so the browser and the server check the same thing.
- **Look exactly the same.** A moved screen is screenshotted at 360 and 1280 px and compared with
  `docs/look-book` before its batch is done. Planned differences are listed in docs/migration-plan.md.
- **Phone first:** design at 360 px, 44 px touch targets, 16 px inputs, the right keyboard per field,
  every empty state says what to do next, nothing depends on hover.
- **Colours come from tokens only** (`src/styles/tokens.css`), so Pastel, Neutral and a
  school's brand colour all work.
- Ask before adding a dependency.
- The product name is **Brillianda** (the old code says Brillanda).

## Gotchas

- **Next.js 16 differs from older versions.** Read `node_modules/next/dist/docs/` before
  writing Next-specific code (routing, caching, fonts, Server Actions).
- `cacheComponents` is on: request-time data needs a Suspense boundary; read the caching docs.
- `proxy.ts` (renamed middleware) will map `surebloom.brillianda.com` to `/s/surebloom` and forward
  `/api/*` to the backend API (their docs/frontend-integration.md). Until it exists, open
  `/s/<school>/…` directly in development.
- Tailwind v4 runs through `@tailwindcss/turbopack`; theme tokens are in CSS (`@theme`), not a JS config.
  Workspace packages need an `@source` line so their classes are found.
- Screens use `AppShell` from `src/components/shell`. The look (Pastel or Neutral) lives in
  `src/lib/look.ts`; the `<head>` script in the root layout applies it before first paint.
- Browser tests wait for `<html data-hydrated>` (set by `components/Hydrated.tsx`) through
  `open()` in `e2e/tests/helpers.ts`. Don't use `waitUntil: "networkidle"`: Chrome's cached
  prefetches can keep it waiting forever.
- Anything that reads the clock in a Server Component needs `await connection()` (or a read of
  cookies) before it, or Next 16 refuses to prerender.
- Import one file at a time: `@brillianda/ui/Button`, `@brillianda/core/brand` (each package's
  `exports` maps `./*` to its files). The barrels (`@brillianda/ui`, `@brillianda/core`) pull every
  file into the bundle and broke the 170 KB first-load budget. Interactive ui files start with
  "use client", so they are safe to import from Server Components.
- The public screens (signup, sign-in, password) load their zod schema on the first submit
  through `checkLater` in `src/lib/form.ts`; screens inside a school use `errorsFor` from
  `src/lib/formCheck.ts`. Fixed choices that a public screen shows live in zod-free files
  (`core/signupOptions.ts`). Main content must not fade in from opacity 0: Chrome then counts it
  as shown late (or never), and `e2e/tests/budget.spec.ts` fails. Slide it in (`animate-lift`).
