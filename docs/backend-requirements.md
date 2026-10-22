# What the front end needs from the backend

From the Brillianda front-end team. Updated 22 October 2026: only what is still open.

This is the complete list, in one place. Each item says what the problem is, what we need, the
rules that matter, and how we'll know it's done. It is written from the screens' side only: we
test against the **staging API**, not your repositories. If something here already exists in
your development work, reply with the endpoint and we'll connect it.

**How to answer:** for each item, a short reply is enough: "done, here is the endpoint", "done
differently, here is why", or "not yet".

## Contents

- A. Production
- B. New features, in the order we'd like them
- C. Rules both sides must share
- D. What the front end already relies on (please don't change without telling us)

---

## A. Production

### A1. A new shared secret for production

**Problem.** The staging secret (`PROXY_SHARED_SECRET`) was sent in a chat.

**What we need.** Keep it for staging if you like. Please create a **different** secret for
production and share it privately when production is ready.

### A2. Email links: the school's own address

**Problem.** Staging's emails link to `https://staging.brillianda.com/invite?token=…&school=surebloomschool`
(and the same for "Open your school", resets and sign-in links). Schools now have real addresses on
staging, `<school>.staging.brillianda.com`, with https.

**What we need.** The switch your notes of 16 October describe: set `ROOT_DOMAIN=staging.brillianda.com`
on the staging API and drop `FRONTEND_URL`, so links read
`https://surebloomschool.staging.brillianda.com/invite?token=…`. (Until then our side forwards the
`?school=` links to the school's address, so they work either way.)

**Done when.** An invitation email, a reset email and the "school is ready" email each open on the
school's own address.

### A3. Find my school: say when an email has no school

**Problem.** `POST /v1/auth/find-school` answers the same whether or not the email has a school,
and nothing is sent when it has none. People wait for an email that never comes.

**What we need.** When the email has no school, still send an email to that address: "There's no
school on Brillianda for this email", with a link to sign up and a line asking them to check with
their school which email it uses. Keep the API's answer the same either way, so the page never
reveals whether someone has an account; the email does, to its owner only.

**Done when.** An address with no school receives that email.

---

## B. New features, in the order we'd like them

All of these are built on our side and running on sample data. The exact shapes our screens use
are in the front-end repository, `src/data/types.ts` (type names are given below), and each
feature's function list is in `docs/data-contract.md`. The paths below are suggestions in your
existing style. Change them freely, just tell us.

Everything here is for one school, taken from the address, as today.

### B1. Promotion at the end of the session

**Problem.** At the end of the session, students move up, repeat, or graduate.

**Rules.**

- Each student's **yearly average** is the average of their term averages for the session
  (terms with no results are skipped).
- The **pass mark** is per school; by default the lowest passing grade on the scale (40 with the
  default scale).
- Suggested decision: the final class graduates; others move up at or above the pass mark, else
  repeat; a student with no results at all is suggested to move up.
- Any decision can be changed, with an optional reason. Choosing the suggestion again clears the
  change.
- Completing promotion, in the session's last term only: close that term; move each student to
  the next class level, in the arm with the same name if it exists there (else its first arm),
  recorded in their class history; mark graduates as `graduated`; start the next session with
  its first term's dates. Classes, subjects and teachers carry over. Refused while classes are
  unpublished, unless the admin confirms.

**Endpoints we need.**

| What | Suggested | Returns |
|---|---|---|
| The plan: sessions, pass mark, whether it can be completed now, each class with each student's yearly average, terms counted, suggested and current decision, reason, destination; counts; unpublished classes; next session's first term | `GET /v1/promotion` | `PromotionPlan` |
| Set the pass mark | `PUT /v1/promotion/pass-mark` `{ passMark }` (0 to 100) | 204 |
| Set a student's decision | `PUT /v1/promotion/students/{id}` `{ decision, reason }` | 204 |
| Complete it | `POST /v1/promotion/complete` `{ closeUnpublished, startsOn, endsOn }` | `{ promoted, repeating, graduated, session }` |

### B2. Birthday messages

**Problem.** Schools want each student's family to get a birthday greeting, automatically.

**What to store.** Per school: on or off, and the message (up to 300 characters, must include
`{name}`; may include `{age}` and `{school}`). A log of texts sent: student, day, phone, text.

**Rules.**

- Every day at 7:00 am Lagos time, for each active student whose birthday is today, text the
  guardian's phone **once** with the message filled in: `{name}` is the first name, `{age}` the
  age they turn as an ordinal ("12th"), `{school}` the school's name.
- A birthday on 29 February is celebrated on 28 February in other years.
- A guardian with no phone: log it as not sent.
- An SMS provider is needed (for example Termii). Texts with letters like ọ or ẹ are Unicode:
  70 characters a text instead of 160, which costs more.

**Endpoints we need.**

| What | Suggested | Returns |
|---|---|---|
| The settings, the next 30 days' birthdays, the latest 20 texts sent | `GET /v1/birthdays` | `BirthdaysPage` |
| The next 7 days, for Home | `GET /v1/birthdays?days=7` | `BirthdaysThisWeek` |
| Save the settings | `PUT /v1/birthdays/settings` `{ enabled, message }` | 204 |

On the parent's home (`GET /v1/me/children`), each child gains `birthday`: the filled-in message on the child's
birthday when the school sends them, otherwise `null`. Rules: `packages/core/src/birthdays.ts`.

### B3. Books and things needed

**Problem.** Parents need to know which books, exercise books, uniform and other things to buy for
their child's class, especially for the class they move into next session.

**What to store.** A list per school, class level and session (this session or the next): items
with a kind (`textbook`, `stationery`, `uniform`, `other`), a name, optional details (author,
publisher, a note), a quantity (1 to 99) and an optional price in whole naira; up to 80 items. And
whether the list is shared with parents, who changed it last, and when.

**Rules.**

- An empty list can't be shared. Sharing and unsharing go in the change history.
- A parent sees, for each child: the shared list for the next class level (by the school's
  order of levels) for next session, unless the child is in the final class; and the shared list
  for their current class level this session.

**Endpoints we need.**

| What | Suggested | Returns |
|---|---|---|
| Every class level's list for a session | `GET /v1/book-lists?session=2027` | `BookListsPage` |
| Replace one class level's list | `PUT /v1/book-lists/{session}/{levelId}` `{ items }` | 204 |
| Share or stop sharing | `PUT /v1/book-lists/{session}/{levelId}/shared` `{ shared }` | 204, or 409 for an empty list |

On the parent's home (`GET /v1/me/children`), each child gains `bookLists`: `[{ label, list }]`. Rules:
`packages/core/src/booklists.ts`.

### B4. Student details for parents, and corrections

**Problem.** Parents should see what the school has on record for their child, and ask for
mistakes to be fixed without visiting the office.

**What we need.**

- On each child in the parent's home (`GET /v1/me/children`), `details`: first, other and last names, date of birth,
  gender, admission date, state of origin, address, and the guardian's name, phone and email.
- Correction requests: the child, who asked, when, the changes (field, what the record said, what
  it should say), an optional note (up to 300 characters), and the status (`open`, `approved`,
  `declined`) with who answered, when, and the reason for declining.

**Rules.**

- Fields a parent can ask about: `firstName`, `otherNames`, `lastName`, `dateOfBirth`, `gender`,
  `stateOfOrigin`, `address`, `guardianPhone`, `guardianEmail`. Each new value is checked with
  the same rules as the school's student form. Values that match the record are dropped; a
  request with nothing left is refused.
- Only for the parent's own children.
- Approving changes the student's record (or the guardian's, for phone and email) in one go and
  writes it to the change history with the student. Declining needs a reason (3 to 200
  characters), which the parent sees.

**Endpoints we need.**

| What | Suggested | Returns |
|---|---|---|
| Ask for a correction | `POST /v1/me/children/{studentId}/corrections` `{ changes: [{ field, value }], note }` | 201 |
| Requests waiting, then the latest 20 answered | `GET /v1/corrections` | `CorrectionsPage` |
| How many are waiting | `GET /v1/corrections/count` | `{ open }` |
| Approve or decline | `POST /v1/corrections/{id}/resolve` `{ approve, reason? }` | 204, or 409 if already answered |

Each child in the parent's home also gains `corrections`: that child's latest five requests.
Rules: `packages/core/src/corrections.ts`.

### B5. Timetable

**Problem.** Schools need one timetable everyone works from. Admins set it; teachers see it, with
their own lessons highlighted.

**What to store.**

- Per school, the bell schedule: periods in order, each with an id, a name, start and end times
  (`HH:MM`) and a kind (`lesson` or `break`). The same for every class, Monday to Friday.
- Per class, day (1 to 5) and lesson period: a subject.
- Optionally, one timetable document per school (a PDF up to 2 MB), in file storage.

**Rules.**

- A lesson's teacher isn't stored: it's the class's teacher for that subject (`PUT /v1/teachers/{id}/subject-classes`).
- Periods: up to 16, in order, no overlaps, each ending after it starts, at least one lesson.
  Saving a schedule that removes a period (or makes it a break) drops its lessons.
- No lessons in breaks. Flag (don't refuse) a teacher in two classes at once.
- Uploads are read in the browser; the API receives whole classes' weeks to replace.
- Owners and admins change it; teachers read it (all classes).

**Endpoints we need.**

| What | Suggested | Returns |
|---|---|---|
| The whole timetable for staff | `GET /v1/timetable` | `TimetablePage` |
| The bell schedule | `PUT /v1/timetable/periods` `{ periods }` | `{ removed }` |
| One lesson | `PUT /v1/timetable/{armId}/{day}/{periodId}` `{ subjectId \| null }` | 204 |
| Replace classes' weeks | `PUT /v1/timetable/classes` `{ fileName, classes: [{ armId, lessons }] }` | `{ classes, lessons }` |
| The document | `PUT` / `DELETE /v1/timetable/document` (multipart `file`), `GET` to download | 204 |
| A teacher's lessons on a day | `GET /v1/me/lessons?day=` | lessons in period order |

Rules: `packages/core/src/timetable.ts`.

### B6. Student accounts and the student portal

**Problem.** Students need their own sign-in: to see their timetable, attendance, results and
book list, and to take tests (CBT, next).

**Who.** A new role, `student`. A student's account links to their student record. Every student
endpoint returns only that student. Students are refused by owner, admin, teacher and parent
endpoints.

**Rules.**

- Students sign in with email and password, like staff (invitations, with role `student` and
  the `studentId`). The email is the student's own or one the school gives them; it can't belong
  to someone else at the school.
- Ending access removes the account's role at this school; the student's record stays.
- Students are often under 18: this is the reason for the AI terms check in
  `docs/ai-integration.md`, Step 0, and for the child-safety and data-protection duties that
  come with it.

**Endpoints we need.**

| What | Suggested | Returns |
|---|---|---|
| Students with their portal access | `GET /v1/student-accounts` | `StudentAccountsPage` |
| Invite a student | `POST /v1/students/{id}/invite` `{ email }` | 201 |
| End access or cancel the invite | `DELETE /v1/students/{id}/access` | 204 |
| The student's home | `GET /v1/me/student` | `StudentHome` |
| Their class's week | `GET /v1/me/timetable` | `ClassTimetable` |
| Their report card, once published | `GET /v1/me/report-card?term=` | `ReportCardData` |

### B7. The question bank and AI-generated questions

**Problem.** Teachers build up questions for tests, assignments and exams, and want AI to draft
them, which they then check.

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

### B8. CBT: tests taken on Brillianda

**Problem.** Teachers want to set tests that students take on a phone or computer, mark
themselves where they can, and feed the score sheets.

**What to store.**

- Tests: title, instructions, subject, class level, classes, a copy of the questions (from B7),
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
- Change history: `GET /v1/changes`
- Website: `POST /v1/trial-requests`
