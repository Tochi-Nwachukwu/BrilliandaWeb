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

### Signing in and the team (batch 4)

About the `school` argument on these actions: in development pages live at `/s/<school>/…`, so the
page passes the school it is on. The real actions must take the school from the request's host
(`proxy.ts`) and ignore this argument, then check the person belongs to that school.

| Function | Kind | Input / output | Used by | Status |
|---|---|---|---|---|
| `getCurrentMember` | read | `subdomain` → `SignedInMember \| null`; someone signed in at another school counts as signed out | school pages, sign-in | fake |
| `getMySchools` | read | — → `SchoolSummary[]` (active schools of the signed-in person) | `/login` picker | fake |
| `getInvite` | read | `subdomain, token` → `InviteDetails \| null` (open, used or expired; whether they already have an account) | accept invite | fake |
| `listMembers` | read | `subdomain` → `SchoolMember[]`: owner, admins, open invites; empty for non-members | More › Admins | fake |
| `signIn` | action | `school, signInSchema` → `ActionResult<null>`; unknown email, wrong password and another school's account all give the same message | sign in | fake |
| `signOut` | action | `school` → redirects to the school's sign-in | account menu | fake |
| `requestPasswordReset` | action | `school, emailOnlySchema` → `ActionResult<SampleEmail>`; the same answer whether or not the email is on file; link lasts 1 hour | forgot password | fake |
| `resetPassword` | action | `school, token, newPasswordSchema` → `ActionResult<null>`; ends every other session | reset password | fake |
| `sendMagicLink` | action | `school, emailOnlySchema` → `ActionResult<SampleEmail>`; same answer either way; works once, 1 hour | email sign-in link | fake |
| `signInWithLink` | action | `school, token` → `ActionResult<null>`; called by a button press, so link scanners can't spend it | email sign-in link | fake |
| `findMySchool` | action | `emailOnlySchema` → `ActionResult<SampleEmail>`; emails a link to each school; never says whether the email exists | `/login` | fake |
| `acceptInvite` | action | `school, token, { password, confirmation } or { password, hasAccount: true }` → `ActionResult<null>`; signs in | accept invite | fake |
| `inviteAdmin` | action | `school, inviteAdminSchema` → `ActionResult<SampleEmail & { resent }>`; owner only; re-inviting the same email resends | Admins | fake |
| `cancelInvite` | action | `school, inviteId` → `ActionResult<null>`; owner only | Admins | fake |
| `removeAdmin` | action | `school, userId` → `ActionResult<null>`; owner only; never the owner | Admins | fake |

`SampleEmail` (`{ sampleLinks? }`) is **fake only**: the links an email would carry, so the screens
can be clicked through. The real functions return nothing there. `src/data/samples.ts`
(one-tap sample accounts on sign-in pages) is fake only too and goes when the fakes go.
Sample accounts: `owner@greenfield.ng`, `admin@greenfield.ng` (also an admin at Surebloom),
`owner@surebloom.ng`; password `brillianda`. Open invite: `/s/greenfield/invite/demo-invite`.

### Home and the calendar (batch 5)

| Function | Kind | Input / output | Used by | Status |
|---|---|---|---|---|
| `getSession` | read | `subdomain` → `SessionSetup \| null`: session year, 2 or 3 terms, and `confirmed` (false until saved; unsaved schools get suggested dates from `defaultTerms`) | Home, Sessions and terms | fake |
| `getSetupProgress` | read | `subdomain` → `SetupProgress`: the plan's six steps (calendar, classes, arms, subjects, students, admins) done or not, and whether the checklist is hidden | Home | fake |
| `getHomeSummary` | read | `subdomain` → `HomeSummary`: counts of students, classes, arms, subjects, admins, and the 6 latest changes (the audit log) | Home | fake |
| `saveSession` | action | `school, sessionSchema` → `ActionResult<SessionSetup>`; owners and admins; writes a change entry | Sessions and terms | fake |
| `hideChecklist` | action | `school, hidden` → `ActionResult<null>` | Home | fake |

- Field errors use the full path for nested fields (`terms.1.startsOn`), via `fieldErrorsOf` in core.
- At signup, `createSchool` stores suggested dates for the session year the owner chose; the calendar
  step counts as done once someone saves it.
- Fake: classes, arms, subjects and students are always 0 until batches 6 to 9 add their fakes.
  Calendar-less sample schools for trying the checklist: `royalheights` (`owner@royalheights.ng`)
  and `kingsway` (`owner@kingsway.ng`).

## The backend so far (read 8 October 2026, brillianda-backend `8287ba2`)

The backend team built a **separate API** (Hono, `openapi.json` is the contract), not Server
Actions inside this app — see their `docs/decisions.md`. What that means for us:

- Our data functions stay the seam. When an endpoint is ready, the matching fake is replaced by a
  call to the API through a generated client (`openapi-typescript` + `openapi-fetch`), and its
  `{ error: { code, message, details[] } }` errors are turned into our `ActionResult`
  (`validation_failed` details become `fieldErrors`).
- Their `docs/frontend-integration.md` puts `proxy.ts` in this repo: it forwards `/api/*` on each
  school's host to the API with a shared secret and maps the subdomain to `/s/[school]`. We add it
  when the first real endpoint is wired.
- Ready now: `GET /v1/school` (`PublicSchool`: id, name, subdomain, brandColor or null, logoUrl or
  null), `GET /v1/me` (user, membership.role owner/admin, school), `POST /v1/auth/logout`.
  Signup and sign-in are their next phase; calendar, classes, subjects and students after.
- Shapes already agree: roles `owner`/`admin`; schools keep levels offered, state, phone, brand
  colour; the address rule (3 to 30 characters, starts with a letter, no `--`) is the same.
  Their brand colour can be null: we fall back to our violet.

### Classes and arms (batch 6)

| Function | Kind | Input / output | Used by | Status |
|---|---|---|---|---|
| `getClassStructure` | read | `subdomain` → `ClassStructure`: levels (ordered, with section), arm names (once per school, with codes), arms (level × arm name, department, archived, student count), and the levels offered at signup | Classes, Home | fake |
| `setupClasses` | action | `school, classSetupSchema` (levels, arms with codes, arms per level) → `ActionResult<null>`; only while the school has no classes | quick setup | fake |
| `renameLevel` · `addLevel` · `removeLevel` · `setLevelArchived` | action | `levelNameSchema` / `newLevelSchema`; removing is refused while any of its arms has students | Classes | fake |
| `addArm` · `renameArmName` · `setArmDepartment` · `setArmArchived` · `removeArm` | action | an existing arm name or `armNameSchema`; a rename applies in every class; departments are for senior arms; removing is refused with students or for a class's only arm | Classes | fake |

The ladder, naming schemes, default range from the levels offered, arm presets, codes and the
preview sentence are pure functions in `packages/core/src/classes.ts`, with tests.
