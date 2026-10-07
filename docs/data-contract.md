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
| `requestTrial` | action | trial form values → `ActionResult<null>`; checked with `validateTrialRequest` (core). Accept a filled honeypot (`website`) silently | marketing site | fake |
| `getSignupDraft` | read | — (reads the signup cookie) → `SignupDraft \| null`; never returns the password | signup screens | fake |
| `saveSchoolDetails` | action | `schoolDetailsSchema` → `ActionResult<SignupDraft>`; starts a draft | signup 1 | fake |
| `saveOwnerAccount` | action | `ownerAccountSchema` → `ActionResult<SignupDraft>`; sends the 6-digit code (Resend); bot check (Turnstile) goes here | signup 2 | fake |
| `resendSignupCode` | action | — → `ActionResult<SignupDraft>`; refuses within 60 s of the last code | signup 3 | fake |
| `verifySignupEmail` | action | `verifyCodeSchema` → `ActionResult<SignupDraft>`; codes last 10 minutes | signup 3 | fake |
| `checkSubdomain` | action | `name, state?` → `SubdomainCheck` (free, or taken / reserved / invalid with up to 3 suggestions); rate limit it | signup 4 | fake |
| `createSchool` | action | `schoolAddressSchema` → `ActionResult<{ subdomain, url }>`; one transaction (plan: "What happens on Create"), then signs the owner in on the new address and returns where to go | signup 4 | fake |

### Notes for the real signup

- The fake keeps the draft id in an httpOnly cookie, `brillianda_signup`. Any way of resuming a
  closed tab works, as long as `getSignupDraft` returns where the person got to.
- Fake codes: any 6 digits work, except `000000`, which is "wrong" so the error can be seen.
- Fake taken addresses: `greenfield`, `surebloom`, `closedschool`, `royalheights`.
- After `createSchool` the page does a full load of `url`. For real this is the one-time handover
  token on `<subdomain>.brillianda.com`; in development the fake returns `/s/<subdomain>`.
