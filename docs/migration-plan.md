# Moving Brillianda's front end to the v1 plan, batch by batch

**Goal:** follow Tochi's plan ([Brillianda: school management system plan](https://docs.google.com/document/d/1wRAFL1nE5eKV9ZWC2w8suXJ8p-4pOMD5T76Dt9XJh2Q), Oct 6, 2026)
while keeping today's app looking, feeling and working **exactly** as it does now.

**Our part is the front end only.** A teammate restructures the backend: database, row-level
security, login system, and how each school's address is handled on the server. We build every
screen and the logic that runs in the browser, on clearly marked fake data, so the backend slots in
underneath without the screens changing.

## Decisions already made

- The product is called **Brillianda**.
- "When did your school start" means **the start of the school's first session**. Signup asks for
  it. The class list is a separate question (first class and last class).
- We follow the plan's front-end stack: Next.js 16 (App Router), React 19, Tailwind v4,
  shadcn/ui, React Hook Form + Zod, TanStack Table, Playwright. The look and behaviour come from
  our current app.
- **We don't touch the backend.** No database tables, policies, migrations, login setup or server
  internals.

## Who does what

| Area (plan section) | Front end (us) | Backend (teammate) |
|---|---|---|
| Marketing site, signup screens | All screens, step-saving, client checks | Creating the school, email codes, subdomain check, handover token |
| School address and branding | School layout, logo/colour/theme in the UI, per-school app manifest | `proxy.ts`, looking up the school, suspended/unknown handling |
| Login, reset, Find my school, invites | All screens | Better Auth, sessions, roles, sending email |
| Calendar, classes, arms, subjects | All screens; the class ladder generator (pure logic) | Saving it; the subject catalogue seed |
| Students and import | All screens; reading spreadsheets in the browser; Excel templates | Saving, admission counter, re-checking rows, duplicates, undo |
| Database, RLS, `withSchool`, `schoolAction`, audit log | — | All of it |

## Where front end and backend meet

The plan has no separate API. Pages read data in Server Components and save through Server Actions.
So the meeting point is **a set of typed functions**, one per thing a screen needs:

- `apps/web/src/data/` holds them, for example `listStudents(filters)`, `enrolStudent(input)`,
  `generateClasses(answers)`, `checkSubdomain(name)`.
- Their inputs are **Zod schemas in `packages/core`**: one schema checks the form in the browser,
  and the backend uses the same schema on the server, as the plan asks.
- We ship a **fake version** of each function on sample data (like today's sample data), marked
  clearly. The backend teammate replaces each fake with the real one, and the screens don't change.
- Every function and schema is listed in `docs/data-contract.md`, so the backend teammate knows
  exactly what to build.

## Before batch 1 (needs people, not code)

| # | What | Who |
|---|---|---|
| A | Where the shared Next.js app lives, since we and the backend teammate both work in it. Proposal: this repo (BrilliandaWeb), branch `v1` | You and the backend teammate |
| B | Agree the data-function approach above with the backend teammate | You |

## How every batch runs

1. I build it on the `v1` branch, test-first where there's logic.
2. Typecheck, unit tests and Playwright at **360 px and 1280 px** pass.
3. **Look check:** each moved screen is screenshotted and compared with the baseline from batch 0.
   It must match before the batch counts as done.
4. I commit, push, and tell you what to look at. You check it, ideally on a real Android phone too.

## The batches

| Batch | Plan phase | What you'll see when it's done | Size |
|---|---|---|---|
| 0 | prep | Nothing new: today's app frozen, and a screenshot "look book" of every screen | Small |
| 1 | Phase 0 | An empty Next.js app that builds and tests green, with our shared logic moved in | Medium |
| 2 | Phase 0 | Our exact look in Next.js: colours, font, components, app shell | Medium |
| 3 | Phase 1 | The marketing site moved across, and the 4-step signup screens | Large |
| 4 | Phase 1 | Each school's look (logo, colour, login page), sign-in screens, admin invites | Medium |
| 5 | Phase 2 | Home with the new setup checklist; sessions and terms | Medium |
| 6 | Phase 2 | Class ladder and arms setup, and the Classes pages | Large |
| 7 | Phase 3 | The subject catalogue and the class-by-subject grid | Medium |
| 8 | Phase 4 | The Students pages, student page and bulk actions | Large |
| 9 | Phase 4 | The import, with Excel files, fix-in-place and undo screens | Large |
| 10 | Phase 5 | Installable app per school, speed budget, accessibility checks | Medium |

### Batch 0: Freeze and baseline

- Tag today's app (`vite-final`) so it can always be run and compared.
- Take the **look book**: screenshots of every screen and state at 360 px and 1280 px, in Pastel
  and Neutral. This is the "exactly the same" reference for every later batch.
- Save the plan as `docs/plan.md` in the repo, as the plan itself asks.
- List each screen's behaviours (what each button does) as a checklist to tick off when moved.

**Done when:** the look book exists and the tag is pushed.

### Batch 1: The new skeleton (Phase 0, front-end side)

- pnpm workspaces + Turborepo in the plan's layout: `apps/web` (Next.js 16), `packages/core`,
  `packages/ui`, `packages/config`, `e2e/`. The backend packages (`db`, `auth`, `email`) are left
  for the teammate.
- Today's app moves to `legacy/` and keeps running beside the new one, for comparing.
- **Logic carried across now:** admission numbers, spreadsheet reading (headings, dates, genders,
  class names), grading. They become `packages/core` with their existing tests.
- The `apps/web/src/data/` folder with the fake-data pattern, and `docs/data-contract.md`.
- CI: typecheck, lint, unit tests, Playwright. Root `CLAUDE.md`.

**Done when:** CI is green and the empty app starts at `localhost:3000`.

### Batch 2: Our look in Next.js (Phase 0)

- Tailwind v4 with our colour tokens, both looks (Pastel and Neutral), and our animations.
- Outfit through Next.js fonts, subset to stay light.
- shadcn/ui set up and **painted with our tokens**, so its parts look like ours.
- Our components moved into `packages/ui`: buttons, badges, fields, cards, tabs, dialogs, side
  panels, toasts, hero, ring, carousel, icons, empty states.
- The plan's four responsive components built in our style: **DataList, ResponsiveDialog,
  FilterSheet, ActionBar**.
- The app shell: sidebar on laptop, bottom tab bar on phone, account menu, and the plan's
  command palette (Ctrl or Cmd + K).
- A gallery page of every component, compared with the look book.

**Done when:** the gallery and an empty app shell match the look book at 360 and 1280 px.

**Done (7 October 2026).** See it with `pnpm dev` at `localhost:3000/dev` (development only;
production returns "not found"). Notes:

- The shell's tabs follow the plan: **Home, Students, Classes, Subjects, More**. Publishing,
  Staff and Settings were the old app's tabs; settings, sessions and terms, and admins go
  under More.
- shadcn/ui is set up (`packages/ui/components.json`) and adds parts in our style when a screen
  needs one. None was needed yet: our own components already covered the gallery.
- The command palette uses `cmdk` inside our own dialog, so it looks like the rest of the app.
- DataList sits inside its own loading boundary because, in development only, the table library
  reads the clock, which Next.js 16 doesn't allow while pre-rendering. Production is unaffected.
- The saved look is now kept under `brillianda:look` (it was `brillanda:look`), so on the new
  address everyone starts on Pastel once.

### Batch 3: Marketing site and signup screens (Phase 1)

- The marketing site moved into Next.js, looking exactly as it does now.
- **Signup in 4 screens**, in our design: school details (including *when your first session
  starts*), owner account, 6-digit code (expiry and resend timers), school address (checked as you
  type, suggestions, reasons a name is unavailable). Each step saves its draft as it goes.
- The subdomain rules as pure logic in `packages/core` with tests (length, characters, reserved
  names, suggestions from the school name), so the browser and the server agree.
- On fake data: any 6-digit code works, some sample names are "taken".

**Done when:** the whole signup can be clicked through on a phone against fake data.

**Done (7 October 2026).** Notes:

- The site is its own root layout in `src/app/(marketing)` with its own CSS, so its warm-paper
  design and the app's Pastel never mix. Its markup moved over unchanged (only the name changed),
  so it looks exactly the same; its scripts (intro, reveals, the live mark sheet, the trial form)
  run as before. The copy still describes results and report cards, which are after v1; it is
  left as it is.
- "Sign in" on the site goes to `/login`, which the plan makes the Find my school page (batch 4).
- Signup lives at `/signup`, `/signup/account`, `/signup/verify` and `/signup/address`, in the
  old sign-in screens' design. Step 1 asks when the first session on Brillianda starts (month
  and year, September by default).
- The address rules, suggestions and the signup schemas are in `packages/core` with tests.
- Browser tests now run against a production build (port 3100), which made them fast and steady.

### Batch 4: Each school's look, and signing in (Phase 1)

- The school layout: logo, name and **brand colour**. Proposal: the school's colour on buttons and
  highlights, everything else Pastel, with readable text worked out automatically (tested).
- Our sign-in page, branded per school; password reset; magic-link screen; **Find my school**;
  the school picker for people in several schools; "Powered by Brillianda".
- Admin invites and accepting an invite (our Staff screens). Owner vs admin differences in the UI.
- Not-found and suspended-school pages.

**Done when:** two fake schools show their own look and sign-in page, on a phone and a laptop.

**Done (7 October 2026).** Notes:

- The brand colour goes on buttons, the active tab and highlights; everything else stays Pastel
  (or Neutral). `brandPalette` in `packages/core` works out readable text for any colour (WCAG AA,
  tested over awkward colours; a few mid-tones get a slightly darker button so white text reads).
- Pages: `/s/<school>/login`, `forgot-password`, `reset-password/<token>`, `magic-link`,
  `magic/<token>`, `invite/<token>`; signed in: Home (batch 5), Students, Classes, Subjects
  (placeholders for later batches), More › Admins. `/login` is Find my school plus the picker.
- On a laptop the sign-in's brand panel becomes the school's own panel; on a phone the school's
  mark sits on top and "Powered by Brillianda" at the foot. The phone top bar shows the school's
  mark and a search button for the command palette (plan: logo, search, account menu).
- Only the owner invites, resends, cancels and removes admins; admins see the team.
- Not done here: the per-school app manifest (plan: Add to Home Screen) — it needs the logo
  upload, which belongs with school settings.

### Batch 5: Home, checklist, sessions and terms (Phase 2)

- Home in today's design: the setup checklist with the plan's steps (calendar, classes, arms,
  subjects, students, invite an admin), then a summary (students, classes, recent changes).
- Sessions and terms in today's Session design: three terms with Lagos-style default dates,
  editable names (Autumn, Spring, Summer), two or three terms.

**Done when:** a fake new school can set its calendar from the checklist on a phone.

**Done (7 October 2026).** Notes:

- Home keeps today's design: the greeting (with the date and "First Term, week 4 of 14" once the
  calendar is set) and photo card, then the plan's six-step checklist, the four counts and recent
  changes. Results-only parts of the old Home (publishing, reopen requests, progress by class)
  belong to later versions and stay in `legacy/`.
- Admins don't see the "Invite an admin" step, since only the owner invites.
- Sessions and terms (More › Sessions and terms): the old Session screen's term tiles, then the
  form: session year, 2 or 3 terms, names (First/Second/Third or Autumn/Spring/Summer, or typed),
  dates. Suggested dates follow Lagos: Monday 14 September 2026 to Friday 18 December, and so on.
  `defaultTerms`, `sessionSchema` and `termPosition` are in `packages/core` with tests.
- Dates and the greeting use Lagos time (`src/lib/time.ts`), whatever the server's time zone.

### Batch 6: Classes and arms (Phase 2)

- The **class ladder generator** in `packages/core`, with tests: first and last class, naming
  schemes (Nigerian, Basic, British, American), rename, remove, add.
- Arms: 1 to 10 per class, presets (letters, colours, flowers, gems, your own), short codes,
  per-class overrides, departments for senior classes, the preview sentence.
- Today's Classes pages, moved and widened beyond JSS and SS (pre-school, primary).
- The rename and archive rules shown in the UI (no deleting a class or arm with students).

**Done when (plan's gate, front-end side):** JSS 1 to SS 3 with three flower-named arms produces 18 classes on a phone.

**Done (9 October 2026).** The quick setup is two steps (classes, then arms) on the Classes tab
until a school has classes; then the tab shows them by section in the old Classes page's style.
Phone chips read "JSS1 GOL", the laptop shows full names. The plan's gate is a browser test.

### Batch 7: Subjects (Phase 3)

- Screens for picking from the catalogue (NERDC 2025 and legacy tags), custom subjects, short
  codes and renames. The catalogue itself is the backend's seed; we use a fake copy.
- Class-by-subject: a grid on laptop, toggles per class on phone; compulsory or elective; departments.

**Done when:** every class level in a fake demo school can have its subjects set on a phone.

**Done (9 October 2026).** The first visit to Subjects shows the catalogue with the 2025 list
ticked for the school's classes (legacy subjects on their own tab, own subjects added by name).
After that: a grid of subjects against class levels on laptop (tap: compulsory, elective, off), and
one level at a time with Off / Compulsory / Elective on phone. The plan's gate is a browser test.

### Batch 8: Students (Phase 4)

- Today's Students list, enrol form and student page, moved.
- New fields from the plan: first, last and other names; address; state of origin; photo.
- **Guardians** shown and linked, shared by siblings ("this phone number already exists, link
  them?"); phone numbers shown as +234.
- Statuses including **suspended**; filters by class, arm, gender and status; search that ignores
  accents; **bulk move, change status and export** (formula-safe); a list of 1,000 that scrolls smoothly.
- Change history on the student page (from the backend's audit log, fake for now).

**Done when:** a school can add, find, edit, move and export students on a phone, on fake data.

### Batch 9: Import (Phase 4)

- Today's import screens, moved, plus:
- **Excel files** read in the browser, and **Excel templates with Class and Arm dropdowns**.
- Up to 5,000 rows; "JSS 1A" split into class and arm; the column mapping remembered.
- Duplicates with **Update or Skip**; **fix cells in place** (a bottom sheet on phone); download
  only the failed rows; the progress of a chunked import; **Undo** within 24 hours.

**Done when (plan's gate, front-end side):** a 1,000-row list with planted errors can be fixed and imported on a phone, on fake data.

### Batch 10: Front-end hardening (Phase 5)

- Each school's installable app (name and icon), and the offline banner.
- Speed budget in CI (under 2.5 s to show, under 170 KB of JavaScript on first load).
- Accessibility pass (WCAG 2.2 AA), Playwright flows for every screen at both sizes.
- Retire `legacy/` once every screen is moved.

**Done when:** the speed and accessibility checks pass in CI.

## What isn't in v1 (kept for later)

Built today but "after v1" in the plan. Their code stays in `legacy/` and moves across, looking
the same, when their phase comes:

- Teacher portal and score entry
- Parent portal
- Results, publishing and report cards
- Closing a term, promotion and the session end
- The Brillianda team console
- The "try one class" first run (signup and the checklist replace it)

## Where the look will change, on purpose

Everything else should match the look book. These change because the plan changes them:

- **Home:** today it leads with results progress. v1 has no results, so Home shows the setup
  checklist, then counts and recent changes, in the same cards and style.
- **Sign-in:** carries the school's logo, name and colour instead of the Brillianda panel.
- **Forms:** gain the plan's extra fields (first and last names, address, guardians) in the same style.
- **Sample-account buttons** give way to fake demo schools until the backend is ready.
- **The name:** Brillanda becomes Brillianda everywhere.
- **Signup step 2 has no phone** (decided 7 October 2026). The plan lists an optional owner
  phone, but step 1 already asks for the school's phone and nothing in v1 uses a second one.
  Owners can add theirs later in their profile.
