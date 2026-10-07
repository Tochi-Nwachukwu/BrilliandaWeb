# Data contract: where the front end meets the backend

The plan has no separate API: pages read in Server Components and save through Server Actions. So
the front end and the backend meet at **typed functions in `apps/web/src/data`**. Screens call only
these. Each one ships with a **fake implementation** in `apps/web/src/data/fake`, on sample data, so
every screen works before the backend does. The backend teammate replaces each fake with the real
thing; the screens don't change.

## Conventions

- **Reads** are plain async functions, called from Server Components:
  `getSchoolBySubdomain(subdomain): Promise<SchoolSummary | null>`.
- **Writes** are Server Actions (files with `"use server"` in `src/data/actions`). They take one input
  object and return an `ActionResult`:

  ```ts
  type ActionResult<T> =
    | { ok: true; data: T }
    | { ok: false; error: string; fieldErrors?: Record<string, string[]> };
  ```

  `error` is a sentence for a person to read; `fieldErrors` sit under each form field.
- **Inputs are Zod schemas in `packages/core`.** The form checks them in the browser; the real
  action must parse the same schema on the server (the plan's `schoolAction()` does this).
- **The school comes from the address, never from input.** Functions that act on a school take the
  subdomain from the route (`/s/[school]`) and the backend resolves it; no function accepts a school id
  from the browser.
- Fakes keep their data in memory on the server (`src/data/fake/store.ts`), so it resets when the
  dev server restarts. Every fake file starts with `// FAKE:` so they're easy to find.

## Functions

Each batch adds its functions here. **Status:** `fake` (front end only) or `real` (backend done).

| Function | Kind | Input / output | Used by | Status |
|---|---|---|---|---|
| `getSchoolBySubdomain` | read | `subdomain: string` → `SchoolSummary \| null` | school layout | fake |
