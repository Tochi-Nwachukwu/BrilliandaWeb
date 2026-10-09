# Brillianda (front end)

Brillianda v1 is a self-serve school registry for Nigerian schools: a school signs up, gets its own
address (surebloom.brillianda.com), and manages its calendar, classes, arms, subjects and students,
on a phone as easily as on a laptop.

- **The plan:** [docs/plan.md](docs/plan.md) (exported from Tochi's Google Doc, the source of truth)
- **How the front end moves to it:** [docs/migration-plan.md](docs/migration-plan.md)
- **Where the front end meets the backend:** [docs/data-contract.md](docs/data-contract.md)
- **What it must look like:** [docs/look-book](docs/look-book) (screenshots of the app before the move)
- **Earlier decisions:** [DECISIONS.md](DECISIONS.md)

This repo is the front end. The backend (database, row-level security, login) is built separately
and plugs in behind `src/data`. Until then, every screen runs on clearly marked fake data.

## Run it

Needs Node.js 20.19+ and pnpm 10 (`npm i -g pnpm@10`).

```sh
pnpm install
pnpm dev             # http://localhost:3000
```

| Command | What it does |
|---|---|
| `pnpm test` | Unit tests (packages) |
| `pnpm typecheck` | Type-check the app and every package |
| `pnpm lint` | Lint |
| `pnpm build` | Production build |
| `pnpm e2e` | Playwright flows at 360 and 1280 px |

## Layout

```
src/               the Next.js 16 app (the repo root is the app): the marketing site and every school
  app/             pages: (marketing)/ for brillianda.com, (app)/ for signup, sign-in and s/[school]/
  data/            the data layer: typed functions with fake implementations (fake/)
packages/core/     pure TypeScript: schemas, generators, admission numbers, spreadsheet rules
packages/ui/       our components and the four responsive patterns
packages/config/   shared TypeScript settings
e2e/               Playwright flows
design/            prototypes and drafts
docs/              the plan, the migration plan, the data contract, the look book
```

## Deploying

The repo root is a plain Next.js app, so importing it into Vercel needs no settings: the default
Root Directory and the detected Next.js preset are right. Shared code in `packages/` is built
with it.

The previous Vite app is not in this repo any more; it is kept at the `vite-final` tag.
