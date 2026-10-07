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
and plugs in behind `apps/web/src/data`. Until then, every screen runs on clearly marked fake data.

## Run it

Needs Node.js 20.19+ and pnpm 10 (`npm i -g pnpm@10`).

```sh
pnpm install
pnpm dev             # http://localhost:3000
```

| Command | What it does |
|---|---|
| `pnpm test` | Unit tests (packages) |
| `pnpm typecheck` | Type-check every package |
| `pnpm lint` | Lint |
| `pnpm build` | Production build |
| `pnpm e2e` | Playwright flows at 360 and 1280 px |

## Layout

```
apps/web/          Next.js 16 app: the marketing site on brillianda.com, the school app on subdomains
  src/app/         pages: (marketing)/ for the apex, s/[school]/ for each school
  src/data/        the data layer: typed functions with fake implementations (fake/)
packages/core/     pure TypeScript: schemas, generators, admission numbers, spreadsheet rules
packages/ui/       our components and the four responsive patterns
packages/config/   shared TypeScript settings
e2e/               Playwright flows
design/            prototypes and drafts
docs/              the plan, the migration plan, the data contract, the look book
legacy/            the previous Vite app, kept running for comparison until every screen has moved
```
