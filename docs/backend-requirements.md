# What the front end needs from the backend

From the Brillianda front-end team. Updated 26 October 2026: only what is still open.

This is the complete list, in one place. Each item says what the problem is, what we need, the
rules that matter, and how we'll know it's done. It is written from the screens' side only: we
test against the **staging API**, not your repositories. If something here already exists in
your development work, reply with the endpoint and we'll connect it.

**How to answer:** for each item, a short reply is enough: "done, here is the endpoint", "done
differently, here is why", or "not yet".

## Contents

- A. Emails
- B. New features, in the order we'd like them
- C. Rules both sides must share
- D. What the front end already relies on (please don't change without telling us)

---

## A. Emails

### A1. Email links: the school's own address

**Problem.** Staging's emails link to `https://staging.brillianda.com/invite?token=…&school=surebloomschool`
(and the same for "Open your school", resets and sign-in links). Schools now have real addresses on
staging, `<school>.staging.brillianda.com`, with https.

**What we need.** The switch your notes of 16 October describe: set `ROOT_DOMAIN=staging.brillianda.com`
on the staging API and drop `FRONTEND_URL`, so links read
`https://surebloomschool.staging.brillianda.com/invite?token=…`. (Until then our side forwards the
`?school=` links to the school's address, so they work either way.)

**Done when.** An invitation email, a reset email and the "school is ready" email each open on the
school's own address.

---

## B. New features, in the order we'd like them

All of these are built on our side and running on sample data. The exact shapes our screens use
are in the front-end repository, `src/data/types.ts` (type names are given below), and each
feature's function list is in `docs/data-contract.md`. The paths below are suggestions in your
existing style. Change them freely, just tell us.

Everything here is for one school, taken from the address, as today.

### B1. Birthday texts: an SMS account

**Problem.** Birthday messages are built (24 October): the settings, the daily job and the log.
The texts only reach phones once an SMS provider account is set up; on staging they land in the
outbox.

**What we need.** Nothing more from the backend: Brillianda needs to open an SMS account (Termii,
as built) and fund it. Tell us when it's on so we can test a real text.

### B2. The question bank and AI-generated questions

**Problem.** Teachers build up questions for tests, assignments and exams, and want AI to draft
them, which they then check.

**Waiting on:** the AI provider, which Tochi is deciding (Claude, or Gemini if Google agrees in
writing; `docs/ai-integration.md`, Step 0). The question bank itself (saving, editing and the
monthly count) doesn't need the provider and can be built first.

**What to store.** Questions per school, subject and class level, in the shape of `questionSchema`
(`packages/core/src/questions.ts`), with who wrote it, when, and whether it came from AI. AI
generations used per school per month.

**Rules.**

- A teacher sees and writes questions for the subject and class level pairs they teach (their subject classes);
  owners and admins for all. A teacher changes or deletes only their own.
- Generating returns drafts only; nothing is saved until the teacher saves.
- The monthly allowance (300 by default) and everything about the AI call: `docs/ai-integration.md`.
  **Read its Step 0 first**: Google's terms don't allow Gemini in a service used by under-18s.

**Endpoints we need.**

| What | Suggested | Returns |
|---|---|---|
| The bank and this month's AI use | `GET /v1/questions` | `QuestionBankPage` |
| Generate drafts | `POST /v1/questions/generate` (`generateRequestSchema`) | `{ questions, usage }` |
| Save questions | `POST /v1/questions` `{ subjectId, levelId, questions, source }` | `{ saved }` |
| Change or delete one | `PUT` / `DELETE /v1/questions/{id}` | 204 |

### B3. CBT: tests taken on Brillianda

**Problem.** Teachers want to set tests that students take on a phone or computer, mark
themselves where they can, and feed the score sheets.

**What to store.**

- Tests: title, instructions, subject, class level, classes, a copy of the questions (from B2),
  length, opens and closes, `anywhere` or `school`, the access code, shuffle, show score, the
  score-sheet part, draft or set, who set it.
- Attempts: test, student, started, submitted, each answer, the teacher's theory marks, times the
  page was left.

**Rules** (`packages/core/src/cbt.ts`):

- **The server keeps the clock.** Deadline = start + length, or the close, whichever is first.
  Answers are accepted up to 30 seconds after it (slow connections), then the attempt is
  submitted with what was saved.
- **Never send the answers to a student**, not even hidden. Shuffle per attempt, the same order
  every time for that attempt.
- School-only tests need the code to start.
- Objective, true/false and gap answers mark themselves (all or nothing; gaps ignore case and
  spaces). Theory waits for the teacher.
- Sending scores: submitted, fully marked attempts only, scaled to the part's marks (two decimals),
  into the current term's sheet. Sheets marked complete are skipped.

**Endpoints we need.**

| What | Suggested | Returns |
|---|---|---|
| A teacher's tests | `GET /v1/tests` | `TestRow[]` |
| What can go in a test, or a draft | `GET /v1/tests/editor?test=` | `TestEditorData` |
| Save or set a test | `POST` / `PUT /v1/tests/{id}` | `{ id }` |
| Delete a draft | `DELETE /v1/tests/{id}` | 204, or 409 once started |
| Results | `GET /v1/tests/{id}/results` | `TestResults` |
| Mark a theory answer | `PUT /v1/tests/{id}/attempts/{attemptId}/marks/{index}` `{ marks }` | 204 |
| Send scores | `POST /v1/tests/{id}/send-scores` | `{ sent, skipped, lockedClasses }` |
| A student's tests | `GET /v1/me/tests` | `StudentTestRow[]` |
| One test to take | `GET /v1/me/tests/{id}` | `TakingTest` |
| Start, answer, left the page, submit | `POST /v1/me/tests/{id}/start` `{ code }`, `PUT …/answers/{index}`, `POST …/left`, `POST …/submit` | 204, or the score |

## C. Rules both sides must share

A total, grade, position or suggestion must never depend on which side worked it out. These
rules are pure TypeScript with tests in the front-end repository's `packages/core/src`. Copy them
or call the same code:

| File | What |
|---|---|
| `grading.ts` | Subject totals (each part's score ÷ its marks × its weight, rounded half up to 2 decimals), grades from the scale, positions (ties 1, 2, 2, 4) |
| `results.ts` | Default parts and scale, settings checks, class averages and positions, rating settings |
| `attendance.ts` | Marks, school days (Monday to Friday inside a term), the register's checks |
| `promotion.ts` | Yearly average, suggested decision, default pass mark, next class |
| `booklists.ts` | Book list items, totals, categories |
| `corrections.ts` | Which fields parents can correct, and each field's check |
| `timetable.ts` | The bell schedule's checks, clashes, reading uploaded grids, matching subject names |
| `questions.ts` | The question shape, marking answers, shuffling per student, what a generate request may ask |
| `cbt.ts` | Test settings, the window and deadline, scoring an attempt, scaling into a score-sheet part |
| `birthdays.ts` | Filling in the message, ages, 29 February, the coming birthdays, how many texts a message takes |

The default scale: A 70+, B 60+, C 50+, D 45+, E 40+ (all passes), F below 40.

---

## D. What the front end already relies on

Please tell us before changing any of these.

**How we call you.** Browsers never call the API. Our server calls it with:

- `x-forwarded-host`: the school's address. On staging, which has no school subdomains, the
  school is in the path instead: `/s/<school>/v1/...`;
- `x-forwarded-proto`, `x-forwarded-for`, and `x-brillianda-proxy-secret`;
- the person's session cookie for that school, which we keep per school on our side.

**Errors.** Problem documents with a stable `code`, `detail` for people, and `errors[]` with a
`pointer` per field. We show `detail` and put each field's message under its field.

**Endpoints our screens call today.**

- Signup: `GET /v1/signup`, `GET /v1/signup/subdomain-check`, `POST /v1/signup/school`, `/owner`,
  `/resend-code`, `/verify-email`, `/complete`
- Signing in: `GET /v1/me`, `POST /v1/auth/login`, `/logout`, `/handover`, `/magic-link`,
  `/magic-link/confirm`, `/password-reset`, `/password-reset/confirm`, `/find-school`
- The team: `GET`/`POST /v1/invitations`, `DELETE /v1/invitations/{id}`,
  `GET /v1/invitations/lookup`, `POST /v1/invitations/accept`, `GET /v1/members`,
  `DELETE /v1/members/{userId}`
- The school: `GET /v1/school`, `PATCH /v1/school/branding`, `PUT`/`DELETE`/`GET /v1/school/logo`
- Home and the calendar: `GET /v1/home`, `GET /v1/setup`, `PUT /v1/setup/hidden`,
  `GET`/`PUT /v1/session`
- Classes: `GET /v1/classes`, `POST /v1/classes/setup`, `POST /v1/class-levels`,
  `PATCH`/`DELETE /v1/class-levels/{id}`, `POST /v1/class-levels/{id}/arms`,
  `PATCH /v1/arm-names/{id}`, `PATCH`/`DELETE /v1/arms/{id}`, `PUT /v1/arms/layout`
- Subjects: `GET`/`POST /v1/subjects`, `PATCH`/`DELETE /v1/subjects/{id}`,
  `PUT /v1/subjects/{id}/levels/{levelId}`, `PUT /v1/subjects/{id}/department`
- Students: `GET`/`POST /v1/students`, `GET`/`PUT`/`DELETE /v1/students/{id}`,
  `GET /v1/guardians?phone=`, `POST /v1/students/move`, `POST /v1/students/status`,
  `GET`/`PUT /v1/admission-numbers`
- Import: `GET /v1/imports/setup`, `POST /v1/imports/check`, `PUT /v1/imports/mapping`,
  `POST /v1/imports`, `POST /v1/imports/{id}/undo`
- Teachers and the register: `GET /v1/teachers`, `DELETE /v1/teachers/{id}`,
  `PUT /v1/teachers/{id}/subject-classes`, `PUT /v1/arms/{id}/form-teacher`,
  `GET`/`PUT /v1/arms/{id}/register`, `GET /v1/registers/today`, `GET /v1/me/teaching`,
  `GET /v1/arms/{id}/subjects/{subjectId}/students`
- Parents: `GET /v1/parents`, `POST /v1/parents/invite-all`, `POST /v1/guardians/{id}/invite`,
  `DELETE /v1/guardians/{id}/access`, `GET /v1/me/children`
- Staging's outbox: `GET /v1/dev/outbox`
- My profile: `GET`/`PATCH /v1/me`, `PUT`/`DELETE`/`GET /v1/me/photo`, `POST /v1/me/password`
- Results: `GET`/`PUT /v1/results/settings`, `GET /v1/results`, `GET /v1/arms/{id}/sheets`,
  `GET /v1/me/sheets`, `GET /v1/arms/{id}/subjects/{subjectId}/sheet` and its `/scores`,
  `/excluded`, `/complete`, `/unlock-request`, `/unlock`
- Report cards: `GET /v1/arms/{id}/broadsheet`, `GET /v1/arms/{id}/reports`,
  `PUT …/students/{studentId}/remarks/{kind}`, `PUT …/students/{studentId}/ratings`,
  `GET`/`PUT /v1/results/ratings`, `PUT /v1/arms/{id}/published`,
  `GET /v1/students/{id}/report-card`, `GET /v1/students/{id}/report-terms`,
  `GET /v1/me/children/{studentId}/report-card`
- Closing a term: `GET /v1/terms/status`, `POST /v1/terms/close`
- The team console (main site): `POST /v1/team/login`, `/logout`, `GET /v1/team/me`,
  `/overview`, `/schools`, `/schools/{subdomain}`, `PUT …/status`, `GET /v1/team/trial-requests`,
  `PATCH /v1/team/trial-requests/{id}`
- Promotion: `GET /v1/promotion`, `PUT /v1/promotion/pass-mark`, `PUT /v1/promotion/students/{id}`,
  `POST /v1/promotion/complete`
- Birthdays: `GET /v1/birthdays` (and `?days=7`), `PUT /v1/birthdays/settings`
- Book lists: `GET /v1/book-lists`, `PUT /v1/book-lists/{session}/{levelId}` and its `/shared`
- Corrections: `POST /v1/me/children/{studentId}/corrections`, `GET /v1/corrections`,
  `GET /v1/corrections/count`, `POST /v1/corrections/{id}/resolve`
- Timetable: `GET /v1/timetable`, `PUT /v1/timetable/periods`, `PUT /v1/timetable/{armId}/{day}/{periodId}`,
  `PUT /v1/timetable/classes`, `PUT`/`DELETE`/`GET /v1/timetable/document`, `GET /v1/me/lessons`
- Student accounts and portal: `GET /v1/student-accounts`, `POST /v1/students/{id}/invite`,
  `DELETE /v1/students/{id}/access`, `GET /v1/me/student`, `GET /v1/me/timetable`, `GET /v1/me/report-card`
- Change history: `GET /v1/changes`
- Website: `POST /v1/trial-requests`
