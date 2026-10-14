# Data contract: where the front end meets the backend

The plan has no separate API: pages read in Server Components and save through Server Actions. So
the front end and the backend meet at **typed functions in `src/data`**. Screens call only
these. Each one ships with a **fake implementation** in `src/data/fake`, on sample data, so
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

**Links in emails (12 October 2026):** the backend builds `/auth/magic?token=`, `/reset-password?token=`
and `/invite?token=` on each school's address. Those paths forward to our pages
(`/magic/<token>`, `/reset-password/<token>`, `/invite/<token>`), and the fakes now build the same
links. Signup ends at `/auth/handover?token=` on the new address (the API's `handoverUrl`).
What we've asked the backend for is in `docs/backend-asks.md`.

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
| `completeHandover` | action | `school, token` → `ActionResult<null>`; the one-time pass from the end of signup (60 seconds, used once) becomes a session on the school's own address. Real: `POST /v1/auth/handover` | `/s/<school>/auth/handover?token=` | fake |
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
  school's host to the API with a shared secret and maps the subdomain to `/s/[school]`. **Built
  (12 October 2026):** `src/proxy.ts`, rules in `packages/core/src/hosts.ts`. It sets
  `x-forwarded-host`, `x-forwarded-proto`, `x-forwarded-for` and `x-brillianda-proxy-secret` on API
  calls, strips any of those a browser sends, and sets `x-brillianda-school` (the school whose
  address the request came in on) for our own server code; the real data functions should read
  the school from there instead of the `school` argument. Until `API_URL` and `API_PROXY_SECRET`
  are set, `/api/*` answers 503 `api_unavailable`.
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

**Edit arms (added 9 October 2026):** `saveArmLayout` (action): `{ names: [{ key, name, code }], levels: [{ levelId, arms: keys[] }] }` (checked by `armLayoutSchema` in core; `key` is an arm name id, or `new-…` for a new one) → `{ summary }`. All arm names in order, and which classes in use have each. Checked as a whole before anything changes: an arm with students is never removed, every class keeps an arm, names and codes stay unique. An archived arm that is ticked again comes back. Used by Classes › Edit arms.

### Subjects (batch 7)

| Function | Kind | Input / output | Used by | Status |
|---|---|---|---|---|
| `getSubjectsSetup` | read | `subdomain` → `SubjectsSetup`: the school's subjects (catalogue-linked or custom), their links to class levels (compulsory or elective, department), its levels, the NERDC bands it runs, and the catalogue | Subjects, Home | fake |
| `addSubjects` | action | `school, addSubjectsSchema` (catalogue ids, own subjects with codes) → `ActionResult<{ added }>`; catalogue subjects attach to their default levels | Subjects | fake |
| `renameSubject` | action | `subjectNameSchema`; stays linked to its catalogue entry | Subjects | fake |
| `removeSubject` | action | `subjectId` → `ActionResult<null>` | Subjects | fake |
| `setSubjectLink` | action | `subjectId, levelId, "compulsory" \| "elective" \| null` | Subjects grid / phone toggles | fake |
| `setSubjectDepartment` | action | `subjectId, department \| null` for its senior electives | Subjects | fake |

The catalogue copy is `src/data/fake/catalogue.ts` (57 entries: the plan's 2025 lists and the legacy
subjects it names). The real one is platform data the backend seeds. The rules (bands, pre-ticks,
default links, codes) are in `packages/core/src/subjects.ts`, with tests.

### Students (batch 8)

| Function | Kind | Input / output | Used by | Status |
|---|---|---|---|---|
| `listStudents` | read | `subdomain` → `StudentsList`: every student not deleted (`StudentRow`), the classes they can sit in (`ArmOption`), the next admission number | Students, add/edit | fake |
| `getStudent` | read | `subdomain, id` → `StudentDetail`: details, guardian with siblings, class history, changes | student page | fake |
| `getAdmissionSettings` | read | `subdomain` → pattern, digits, next number, preview | More › Admission numbers | fake |
| `addStudent` | action | `studentSchema` → `ActionResult<{ id, admissionNo, fullName }>`; blank admission number takes the school's next (a per-school counter in the real one); duplicates refused | add | fake |
| `updateStudent` | action | `studentId, studentSchema`; a new class is added to the class history | edit | fake |
| `moveStudents` | action | `moveStudentsSchema` (ids, armId) → `{ moved }` | bulk move | fake |
| `setStudentsStatus` | action | `statusChangeSchema` (ids, status) → `{ changed }`; active, suspended, withdrawn, transferred, graduated | bulk / student page | fake |
| `deleteStudent` | action | `studentId`; soft delete, for mistakes only | student page | fake |
| `findGuardian` | action | `phone` → `GuardianMatch \| null`, so siblings share a guardian | add/edit | fake |
| `setAdmissionFormat` | action | `{ pattern, digits }` with `{YEAR}` and `{NUMBER}` | More › Admission numbers | fake |

Export is done in the browser from the list (`toCsv` in core escapes cells starting with =, +, - or
@). Search ignores accents (`matchesSearch`). The student photo the plan lists is not built yet: it
needs file storage from the backend.

### Import (batch 9)

| Function | Kind | Input / output | Used by | Status |
|---|---|---|---|---|
| `getImportSetup` | read | `subdomain` → `ImportSetup`: class levels and arms (for matching), existing students (for duplicates), the remembered column mapping, the last 5 imports | Import | fake |
| `checkImport` | action | `rows` (mapped cells, ≤ 5,000), `armId \| null` → `CheckedRow[]` from `checkRows` in core; the server's own check | Import review | fake |
| `commitImport` | action | `{ rows, armId, update: rowIndexes, fileName }` → `ImportResult`; re-checks, writes ready rows in chunks of 500 under one batch id, updates or skips duplicate admission numbers | Import | fake |
| `undoImport` | action | `batchId` → `{ removed }`; within 24 hours and only if none of the new students was edited since | Import result / recent imports | fake |
| `saveImportMapping` | action | heading (lower case) → column id; offered first next time | Import | fake |

The browser reads Excel (`exceljs`), CSV and Word tables (`.docx`, via `jszip`; the first table
counts as the sheet) and builds the Excel templates with Class, Arm, Gender and State dropdowns
(`src/lib/import`). Word import goes beyond the plan, which lists CSV and Excel. All the matching
and validation rules are pure functions in `packages/core/src/studentImport.ts`, with tests.

### Branding (after batch 10)

| Function | Kind | Input / output | Used by | Status |
|---|---|---|---|---|
| `getSchoolBySubdomain` | read | (as before) `SchoolSummary` with `name`, `brandColor`, `logoUrl` | every school page, Branding | fake |
| `updateBranding` | action | `{ name, brandColor }` (checked by `brandingSchema` in core) → `SchoolSummary`. Owner only | More › Branding | fake |
| `uploadLogo` | action | `FormData` with one file, `logo`: PNG or JPEG, at most 512 px and 300 KB (the browser shrinks and re-encodes it first) → `SchoolSummary`. Owner only | More › Branding | fake |
| `removeLogo` | action | nothing → `SchoolSummary`. Owner only | More › Branding | fake |

The fake keeps the logo in memory as a `data:` URL. The real one stores the file in private
storage and returns a short-lived signed URL as `logoUrl` (plan: uploads), and should re-check
the type and size itself. A Content Security Policy then needs that host in `img-src`. Each change
is recorded in the change history. The setup checklist has a new optional first item,
`branding`, done once the owner has saved this screen.

### Change history (after batch 10)

| Function | Kind | Input / output | Used by | Status |
|---|---|---|---|---|
| `listChanges` | read | `subdomain`, `{ who?, search?, from?, to?, studentId?, limit? }` (days are ISO dates in Lagos time, both ends included) → `ChangeLog`: entries newest first, each with the student it was about (if any), the total that match, everyone who appears, and the filtered student | More › Change history, its CSV download | fake |

The filtering happens on the server, as a real record of two years and more must. Every write
already records a line (`recordChange` in the fakes: who, what, when, and the student when there
is one); the real record is append-only (plan: safeguards). `GET
/s/<school>/more/history/export` returns the same filters as a CSV (up to 1,000 lines, cells
escaped against spreadsheet formulas), or 403 for anyone outside the school.

### Teachers and the daily register (batch 11, after v1)

A third role, `teacher`, alongside `owner` and `admin`. Every admin read and write refuses teachers
(the fakes' `requireMember` leaves them out by default), so a teacher can't reach admin data even by
typing an address. Teacher-facing functions use `requireStaff` and check what the teacher is
assigned. Teachers sign in like admins (email and password, or an email link) and land on
`/s/<school>/teach`.

| Function | Kind | Input / output | Who | Used by | Status |
|---|---|---|---|---|---|
| `getTeachersPage` | read | → `TeachersPage`: teachers (and open invites) with their form classes and subject classes; every arm with its form teacher; the subjects | owner, admin | More › Teachers | fake |
| `inviteTeacher` | action | `{ fullName, email }` → sample email; the invite carries role `teacher` | owner, admin | More › Teachers | fake |
| `removeTeacher` | action | teacher id (or invite id); registers they took keep their name | owner, admin | More › Teachers | fake |
| `setFormTeacher` | action | `armId`, `userId` or null; one form teacher per arm, so setting one replaces the last | owner, admin | More › Teachers | fake |
| `setSubjectClasses` | action | `userId`, `[{ armId, subjectId }]`: the teacher's whole list. Each arm's subject has one teacher, so a class taken here leaves its last teacher | owner, admin | More › Teachers | fake |
| `getRegister` | read | `armId`, `date?` → `Register`: the day (default the latest school day), why it can't be marked (weekend, outside this term), who took and changed it, each student's mark and note, this term's days | admins; the arm's form teacher | register screens | fake |
| `saveRegister` | action | `armId`, `{ date, marks: [{ studentId, mark, note? }] }` (`registerSchema`): every student marked present, late or absent; any school day this term up to today | admins; the arm's form teacher | register screens | fake |
| `getTeacherHome` | read | → `TeacherHome`: form classes (taken today? days taken this term) and subject classes | the teacher | Today, Register, My subjects | fake |
| `getSubjectClass` | read | `armId`, `subjectId` → its students | the subject's teacher; admins | My subjects | fake |
| `getRegistersToday` | read | → `RegistersToday`: on a school day, how many classes' registers are in, and which are missing | owner, admin | Home | fake |

`getStudent` gains `attendance`: this term's days marked, present (late counts as present), late
and absent. School days are Monday to Friday inside a term (`packages/core/src/attendance.ts`, with
tests); public holidays come with the school's own calendar later.

### Parents (batch 12, after v1)

A fourth role, `parent`. A parent's account is linked to a guardian record (`parentLinks`), and
every parent read is limited to that guardian's children. Parents are not staff: admin and teacher
functions refuse them.

| Function | Kind | Input / output | Who | Used by | Status |
|---|---|---|---|---|---|
| `getParentsPage` | read | → `ParentsPage`: guardians with children here, their email and phone, and parent-app access (`none`, `invited`, `active`) | owner, admin | More › Parents | fake |
| `inviteParent` | action | `guardianId` → sample email; needs an email on the guardian's record | owner, admin | More › Parents, student page | fake |
| `inviteAllParents` | action | → `{ invited, withoutEmail }` and sample emails; every guardian with an email not yet invited | owner, admin | More › Parents | fake |
| `removeParentAccess` | action | `guardianId` → ends access (or cancels the invite); the records stay | owner, admin | More › Parents | fake |
| `getParentHome` | read | → `ParentHome`: each of the parent's children with class, admission number, form teacher, attendance this term and the last ten school days' marks (no notes) | the parent | My children | fake |

`getStudent`'s guardian gains `parentAccess`. Invitations carry `role: "parent"` and the
`guardianId` they link to.

### The team console (batch 13, after v1)

Team accounts are separate from school accounts (their own sign-in and cookie, scoped to
`/console`). Every function below refuses anyone who isn't signed in as the team.

| Function | Kind | Input / output | Used by | Status |
|---|---|---|---|---|
| `teamSignIn`, `teamSignOut` | action | `{ email, password }` | `/console/login` | fake |
| `getTeamMember` | read | → `TeamMember` or null | console layout | fake |
| `getConsoleOverview` | read | → `ConsoleOverview`: schools active, paused and new this week; students; trial requests waiting; newest schools; recent activity | Overview | fake |
| `listConsoleSchools` | read | → `ConsoleSchool[]`: status, owner, students, classes, setup progress, joined | Schools | fake |
| `getConsoleSchool` | read | `subdomain` → `ConsoleSchoolDetail`: contacts, counts, setup, last status change. **Writes to that school's change history** (at most once an hour per person) | School summary | fake |
| `setSchoolStatus` | action | `subdomain`, `active` or `suspended`, `reason` (3 to 200 characters) → recorded in the school's history and the team log | School summary | fake |
| `listTrialRequests` | read | → `TrialRequestRow[]`, newest first | Trial requests | fake |
| `setTrialStatus` | action | `id`, `new`/`contacted`/`converted`/`declined`, `note` | Trial requests | fake |

The trial form (`requestTrial`) now stores typed requests with a status.

### Results: score entry (batch 14, after v1)

Results are for the current term (`ResultsTerm`, keyed `<session start year>-<term number>`).
Totals, grades and positions use `packages/core/src/grading.ts` and `results.ts`, which the real
API should use too, so a total never depends on where it was worked out.

| Function | Kind | Input / output | Who | Status |
|---|---|---|---|---|
| `getResultsSettings` | read | → parts, scale, showPositions, scoresEntered | owner, admin | fake |
| `saveResultsSettings` | action | `resultsSettingsSchema`: parts add up to 100 and can't change once scores are in this term; scale needs a band at 0, no repeats | owner, admin | fake |
| `getResultsOverview` | read | → each class's sheets (complete, in progress) and open unlock requests | owner, admin | fake |
| `getArmSheets` | read | `armId` → that class's sheets with teacher, status and progress | owner, admin | fake |
| `getMySheets` | read | → the teacher's own sheets this term | teacher | fake |
| `getScoreSheet` | read | `armId, subjectId` → parts, scale, status, rows (scores, excluded) | admins; that subject's teacher | fake |
| `saveScore` | action | `armId, subjectId, studentId, componentId, raw` ("", "ABS" or a number up to the part's marks, 2 decimals) → status | same; teachers not once complete | fake |
| `setExcluded` | action | `armId, subjectId, studentId, excluded` (electives only; clears their scores) | same | fake |
| `markComplete` | action | `armId, subjectId`; refused while any student who takes it has an empty part | same | fake |
| `requestUnlock` | action | `armId, subjectId, { reason }` (5 to 200 characters) | the teacher | fake |
| `resolveUnlock` | action | `armId, subjectId, approve` → reopens (with or without a request), or declines one | owner, admin | fake |

### Results: broadsheet, remarks, ratings, publishing, report cards (batch 15, after v1)

| Function | Kind | Input / output | Who | Status |
|---|---|---|---|---|
| `getBroadsheet` | read | `armId` → `Broadsheet`: subjects with status; each student's cells (total and grade, `excluded`, or null), average, position (when shown); published | admins; the form teacher (read) | fake |
| `getClassReports` | read | `armId` → remarks and ratings per student, and the school's rating traits | admins; the form teacher | fake |
| `saveRemark` | action | `armId, studentId, kind` (`teacher` or `principal`), `{ text }` up to 300 characters; empty clears it | teacher remark: form teacher or admin; principal: admin | fake |
| `saveRating` | action | `armId, studentId, { trait, value }` (1 to 5, or null) | form teacher or admin | fake |
| `getRatingSettings`, `saveRatingSettings` | read, action | `{ enabled, traits }` (`ratingSettingsSchema`) | owner, admin | fake |
| `setPublished` | action | `armId, publish`; publishing needs every subject complete | owner, admin | fake |
| `getReportCard` | read | `studentId` → `ReportCardData` | admins; the student's form teacher (parents in batch 16, once published) | fake |

### Parents see results (batch 16, after v1)

`getParentHome`'s children gain `results`: the term's name, and once the class is published the
average, position (when the school shows them) and class size. `getParentReportCard(studentId)`
returns `ReportCardData` for the parent's own child only while their class is published; anything
else is "not found".

### Installable app (batch 10)

The service worker (`public/sw.js`) and its page (`/offline`) live at the root of every school
address; `proxy.ts` must serve both as they are, not as a school path. The worker only saves
`/_next/static/` files and `/offline`, never a page or an API response.


No new functions. `src/app/(app)/s/[school]/manifest.webmanifest` and `app-icon/[size]` read
`getSchoolBySubdomain` (name, colour, status). On a school's own address these sit at the root
(`/manifest.webmanifest`, `/app-icon/192`), which `proxy.ts` will map like every other school
path. A school logo upload, when it exists, would replace the drawn initials.
