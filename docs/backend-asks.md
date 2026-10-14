# Requests for the backend team

From the front end, 12 October 2026, after reading the `revamp/v1-backend` branch (commit
`2afeeb7`, "phase one") of `Tochi-Nwachukwu/brillianda`. The new signup, sign-in, password,
find-school and invitation endpoints match our screens closely. Three things would let us connect
them fully.

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
