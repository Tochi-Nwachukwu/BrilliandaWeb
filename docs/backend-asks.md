# Requests for the backend team

> **Replaced by `docs/backend-requirements.md`** (15 October 2026), the complete list in one
> place. This file is kept as the history of earlier requests.

From the front end, 12 October 2026, after reading the `revamp/v1-backend` branch (commit
`2afeeb7`, "phase one") of `Tochi-Nwachukwu/brillianda`. The new signup, sign-in, password,
find-school and invitation endpoints match our screens closely. Three things would let us connect
them fully.

## Where things stand (updated 15 October 2026)

**Asks 1 to 3 and 11 are done.** Thank you: `sessionStart` on signup, `GET` and
`DELETE /v1/members`, the test address `https://api-rouge-nine-18.vercel.app`, and endpoints for
every v1 screen. We've kept them below for the record.

**Connected on our side (15 October):** every v1 screen now calls your API: signup, sign-in,
the team, Home and the calendar, classes, subjects, students, import, change history, branding
and trial requests. To test it end to end on staging we need ask 12.

**Built on our side with no endpoint yet** (these run on sample data, and say "Not connected
yet" when we use your API):

| Area | Ask | Our function list |
|---|---|---|
| Teachers and the daily register | 4 | "Teachers and the daily register (batch 11)" |
| Parents | 5 | "Parents (batch 12)" |
| The team console | 6 | "The team console (batch 13)" |
| Results: score entry | 7 | "Results: score entry (batch 14)" |
| Broadsheet, remarks, ratings, publishing, report cards | 8 | batches 15 and 16 |
| Closing a term | 9 | "Running the school year: closing a term (batch 17)" |
| Promotion | 10 | "Promotion (batch 18)" |

The rules behind most of these (checks, grading, positions, suggestions) are pure functions in
`packages/core` with tests. Please reuse them, or match them, so the two sides agree.

## 1. Signup step 1: the school's first session

**What we need:** `POST /v1/signup/school` to accept when the school's year starts, and
`GET /v1/signup` to return it.

**Why:** our first signup screen asks "When does your school year start?" (a month and a year).
It's the start of the school's first session on Brillianda. We use it to suggest that session's
dates and its three terms, which the owner confirms from the setup checklist on Home. Today the
endpoint takes `name`, `levelsOffered`, `state` and `phone`, so the answer would be lost.

**Suggested shape:**

```json
{
  "name": "Surebloom School",
  "levelsOffered": ["PRIMARY", "SECONDARY"],
  "state": "Oyo",
  "phone": "08030000002",
  "sessionStart": { "month": 9, "year": 2026 }
}
```

`month` 1 to 12, `year` a four-digit year. On `POST /v1/signup/complete`, create that first
session as unconfirmed, with default term dates, so the checklist shows "Set your academic
calendar" with the dates filled in.

## 2. The team: list members and remove an admin

**What we need:**

| Endpoint | Who | Returns / does |
|---|---|---|
| `GET /v1/members` | owner and admins | Everyone in this school: `userId`, `fullName`, `email`, `role` (`owner` / `admin`), `joinedAt` |
| `DELETE /v1/members/{userId}` | owner only | Removes an admin from this school and ends their sessions here. The owner can't be removed. |

**Why:** More › Admins shows who helps run the school and lets the owner remove an admin.
`GET /v1/invitations` covers invitations not yet accepted, but not the people who have joined.

## 3. A test address where the API is running

**What we need:**

- An API we can reach from a browser, for example `https://api-staging.brillianda.com`, running
  the `revamp/v1-backend` code (or `main`, once it's merged).
- Its `PROXY_SHARED_SECRET`, sent privately, not in a repo or chat history.
- The `ROOT_DOMAIN` it expects, so our school addresses match it.
- One test school with an owner account we can sign in with.
- A note when `revamp/v1-backend` is merged, or when any endpoint above changes.

**Why:** we can't run the API on our machines (it needs PostgreSQL through Docker). With a test
address we can check every screen against the real API, not only against its specification.

## Already done on our side, for your information

- `proxy.ts` is built as your `docs/frontend-integration.md` describes: `/api/*` on every address
  goes to `API_URL` with `x-forwarded-host`, `x-forwarded-proto`, `x-forwarded-for` and
  `x-brillianda-proxy-secret`, and any of those a browser sends is removed first. It also sets
  `x-brillianda-school` for our own server code.
- The links your emails build now open the right pages: `/auth/magic?token=`,
  `/reset-password?token=` and `/invite?token=` on each school's address.
- `/auth/handover?token=` exists: it calls `POST /v1/auth/handover` as soon as it opens, then goes
  to Home with the setup checklist. If the pass has expired, it says so and links to sign in.
- We send no Turnstile token yet (`turnstileToken` is optional in your spec). Tell us when it
  becomes required, and the site key to use.

## 4. Teachers and the daily register (added 14 October 2026)

The front end now has teachers and attendance on fake data (see `docs/data-contract.md`, "Teachers
and the daily register"). When you build them, these are the shapes the screens use:

- A `teacher` role beside `owner` and `admin`. Every admin endpoint must refuse teachers, and
  teachers only see the classes they're assigned.
- Invitations with role `teacher` (`POST /v1/invitations` already takes an optional role).
- Assignments: one form teacher per arm; subject teachers per arm and subject (one teacher each).
- Registers: one per arm per school day, a mark per student (`present`, `late` or `absent`, plus
  an optional note up to 120 characters), editable for any school day in the current term, keeping
  who took it and who last changed it. Late counts as present on a report card.

## 5. Parents (added 14 October 2026)

- A `parent` role. A parent's account links to a guardian record; every parent endpoint returns
  only that guardian's children. Parents are refused by admin and teacher endpoints.
- Invitations with role `parent` and the `guardianId` they link to; invite one, or all guardians
  with an email who aren't invited yet; end a guardian's access.
- What a parent sees per child: class, admission number, form teacher, attendance this term, and
  the last ten school days' marks. Not the register's notes.

## 6. The team console (added 14 October 2026)

- Team accounts separate from school accounts, signing in at `brillianda.com/console`.
- Reading a school's summary writes an entry to that school's change history (your plan's
  safeguard: staff access is logged and shown to the school). Summaries are counts and contacts,
  never a student's own record.
- Pausing and reactivating a school with a reason the school can see; trial requests stored
  with a status (new, contacted, converted, declined) and a team note.

## 7. Results: score entry (added 14 October 2026)

- Per-school results settings: score parts (name, marks; they add up to 100; fixed once scores are
  in for the term), a grading scale (thresholds with a band at 0), and whether positions show.
- Scores per student, part, subject, arm and term; `isAbsent` for ABS. Sheets marked complete
  lock for the teacher; unlock requests with a reason, which admins approve or decline.
- Electives: a student can be marked as not taking one, which removes them from that sheet.
- Please compute totals with `packages/core/src/grading.ts` (same as the first app's F-32).

## 8. Results: broadsheet, remarks, ratings, publishing (added 14 October 2026)

- Remarks per student per term: the class teacher's (form teacher or admin) and the principal's
  (admin), up to 300 characters.
- Behaviour ratings: per-school settings (on or off, a list of traits); a 1 to 5 value per
  student, trait and term.
- Publishing per arm and term, only when every subject's sheet is complete; it can be taken
  back. Parents see results only for published arms.
- Report card data as `ReportCardData` in `src/data/types.ts`.

## 9. Closing a term (added 14 October 2026)

- A term stays open for results until an admin closes it (not when its end date passes). Closing
  locks its scores, keeps its results and publishing, drops open unlock requests, and can adjust
  the next term's dates. Refused while classes are unpublished, unless the admin confirms.
- The last term of a session closes through promotion.
- Report cards for any past term, using the class the student was in that term.

## 10. Promotion (added 14 October 2026)

- A per-school pass mark (default: the lowest passing grade) and per-student decisions (promote,
  repeat, graduate) with an optional reason, changeable until promotion is completed.
- Completing it in the session's last term: close that term, move students to the next class in
  the same arm name where it exists, mark the final class graduated, record class history, and
  start the next session. Please use `packages/core/src/promotion.ts` for the suggestions.

## 11. Screens from v1 that have no endpoint yet (added 14 October 2026; done 14 October)

These are v1 screens, built before the after-v1 groups above. The inputs and outputs of each
function are in `docs/data-contract.md`, under the heading named.

**Subjects** ("Subjects (batch 7)"):

- The platform's subject catalogue (we keep a copy of 57 entries in `src/data/fake/catalogue.ts`;
  the real one is platform data you seed).
- A school's subjects: add from the catalogue or its own (with a code), rename, remove.
- Link a subject to a class level as compulsory or elective, and set a department for senior
  electives. Rules: `packages/core/src/subjects.ts`.

**Students and guardians** ("Students (batch 8)"):

- List, view, add, edit and soft-delete students; move several to another arm; change status
  (active, suspended, withdrawn, transferred, graduated). Keep a class history per student.
- Guardians shared between siblings: look one up by phone number when adding a student.
- Admission numbers: a per-school format (`{YEAR}` and `{NUMBER}`, with a digit count) and a
  per-school counter; a blank admission number takes the next one; duplicates refused.
- Student photos need file storage (see Branding); not built on our side yet.

**Import** ("Import (batch 9)"):

- Check up to 5,000 rows on the server (rules: `packages/core/src/studentImport.ts`), then write
  the ready rows under one batch id, updating or skipping duplicate admission numbers.
- Undo a batch within 24 hours if none of its students was edited since.
- Remember the school's column mapping, and list its last five imports. The browser reads the
  file itself (Excel, CSV, Word), so the API only receives rows.

**Branding** ("Branding (after batch 10)"), owner only:

- Change the school's name and brand colour (`brandingSchema` in core).
- Upload a logo (PNG or JPEG, at most 512 px and 300 KB; please re-check type and size) and
  remove it. Store it privately and return a short-lived signed URL as `logoUrl`. Tell us the
  storage host so we can allow it in our Content Security Policy.

**Change history** ("Change history (after batch 10)"):

- An append-only record of every write: who, what, when, and the student when there is one.
- A list endpoint filtered on the server by person, search text, date range (Lagos days, both
  ends included) and student, newest first. We'd also like a CSV export of the same filters (up
  to 1,000 lines, cells escaped against spreadsheet formulas), or we can build it from the list.

**Trial requests** (first table, `requestTrial`):

- A public endpoint for the marketing site's trial form (rules: `validateTrialRequest` in core).
  A filled honeypot field (`website`) should be accepted silently and dropped. The team console
  lists these with a status (ask 6).

**Invitation roles:** `POST /v1/invitations` takes a role, but only `admin` is accepted today. We
need `teacher` (ask 4) and `parent` with a `guardianId` (ask 5).

## 12. To test against staging (added 15 October 2026)

The front end is now connected to every v1 endpoint, with `PROXY_SHARED_SECRET` and the
staging address rule (`x-forwarded-host: <school>.api-rouge-nine-18.vercel.app` and a matching
`Origin`). Signup step 1 saves on staging. Two things stop us testing the rest:

- **A test school with logins.** Please create one on staging (say `fecheck`) with an owner and
  an admin account, and share the passwords privately. With it we can check sign-in, Home,
  classes, subjects, students, import, history and branding end to end.
- **Email on staging.** Signup step 2 answers "We could not send the email just now" (we used an
  `@example.com` address). Codes, magic links, resets and invites all need email. Either verify a
  sending domain in Resend, or give staging a way to read the last email sent to a test address.

Also, for your information:

- The secret was shared in a chat, not privately. Fine for staging; please use a new one for
  production.
- An invitation carries no name, so our accept screen now asks for it. If
  `POST /v1/invitations` took an optional `fullName`, the invite could greet them by name.
