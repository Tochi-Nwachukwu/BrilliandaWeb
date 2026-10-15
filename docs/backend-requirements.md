# What the front end needs from the backend

From the Brillianda front-end team, 15 October 2026.

This is the complete list, in one place. Each item says what the problem is, what we need, the
rules that matter, and how we'll know it's done. It is written from the screens' side only: we
test against the **staging API**, not your repositories. If something here already exists in
your development work, reply with the endpoint and we'll connect it.

**How to answer:** for each item, a short reply is enough: "done, here is the endpoint", "done
differently, here is why", or "not yet". When something reaches staging, please say so (see A4).

## Contents

- A. To keep testing on staging (blocking now)
- B. Small changes to what exists
- C. New features, in the order we'd like them
- D. Rules both sides must share
- E. What the front end already relies on (please don't change without telling us)

---

## A. To keep testing on staging (blocking now)

### A1. Emails don't send on staging

**Problem.** On staging, signup step 2 ("Your account") answers *"We could not send the email
just now. Try again in a minute."* Every flow that sends an email stops there: the signup code,
sign-in links, password resets and invitations.

**What we need.** Emails that arrive on staging, or, if that isn't possible yet, a way for us to
read the last email sent to a test address (for example, a staging-only endpoint or a shared
inbox).

**Done when.** We can sign up a new school on staging from start to finish, and accept an
invitation.

### A2. A test school with logins

**Problem.** Staging has no school we can sign in to, so we can't check sign-in, Home, classes,
subjects, students, import, change history or branding against the real API.

**What we need.** One school on staging (address `fecheck`, or any name you choose) with:

- an **owner** account and an **admin** account;
- a few classes and arms, a few subjects and about 20 students, so the lists aren't empty.

Please share the passwords privately, not in a chat or a repository.

**Done when.** We can sign in to that school on staging as both people.

### A3. A new shared secret for production

**Problem.** The staging secret (`PROXY_SHARED_SECRET`) was sent in a chat.

**What we need.** Keep it for staging if you like. Please create a **different** secret for
production and share it privately when production is ready.

### A4. Knowing what has reached staging

**Problem.** Your development work happens in a repository we don't see. We only learn what
changed by trying staging.

**What we need.**

- Keep `https://api-rouge-nine-18.vercel.app/openapi.json` current with every staging deploy. We
  read the contract from there.
- A short note when staging changes: which endpoints are new or changed, and anything that
  breaks what we call (section E). A message per deploy is enough.

---

## B. Small changes to what exists

### B1. Invitations: the person's name

**Problem.** An invitation carries only an email, so the "Join your school" page can't greet
the person, and the owner's list of open invites shows emails, not names. We now ask for the
name when the invite is accepted, which works.

**What we need (optional, small).** Accept an optional `fullName` when an invitation is created,
and return it when the invitation is looked up and listed.

### B2. Invitations: teacher and parent roles

**Problem.** Invitations accept only the `admin` role. Teachers and parents (C1, C2) join the
same way.

**What we need.** Invitations with role `teacher`, and with role `parent` plus the `guardianId`
the parent's account links to. Accepting a parent invite links that account to that guardian.

**Done when.** An owner or admin can invite a teacher, and invite a guardian to the parent app,
and each lands on their own screens after accepting.

### B3. The student page: attendance and parent access

**Problem.** The student page shows this term's attendance and whether the guardian uses the
parent app. The student endpoint has neither yet.

**What we need, once C1 and C2 exist.** On one student's details:

- `attendance`: `{ term, days, present, late, absent }` for the current term (late counts as
  present), or `null` before the first term starts;
- on the guardian, `parentAccess`: `"none"`, `"invited"` or `"active"`.

---

## C. New features, in the order we'd like them

All of these are built on our side and running on sample data. The exact shapes our screens use
are in the front-end repository, `src/data/types.ts` (type names are given below), and each
feature's function list is in `docs/data-contract.md`. The paths below are suggestions in your
existing style. Change them freely, just tell us.

Everything here is for one school, taken from the address, as today.

### C1. Teachers and the daily register

**Problem.** Schools need teachers on Brillianda: form teachers take the daily register, and
subject teachers enter scores (C4). Some teachers only teach subjects and have no form class.

**Who.** A new role, `teacher`, beside `owner` and `admin`. Teachers must be refused by every
owner and admin endpoint. They see only the classes they're assigned.

**What to store.**

- One form teacher per arm (setting a new one replaces the old).
- Subject teachers per arm and subject: one teacher for each subject in each arm.
- A register per arm per school day: one mark per student (`present`, `late` or `absent`), an
  optional note up to 120 characters, who took it and when, who last changed it and when.

**Rules.**

- School days are Monday to Friday inside a term.
- A register can be saved or changed for any school day in the current term, up to today, by
  that arm's form teacher or by an owner or admin. Every student in the arm must be marked.
- Removing a teacher keeps their name on the registers they took.

**Endpoints we need.**

| What | Suggested | Returns |
|---|---|---|
| Teachers page: teachers and open invites with their form and subject classes; every arm with its form teacher; the subjects | `GET /v1/teachers` | `TeachersPage` |
| Remove a teacher (or cancel their invite) | `DELETE /v1/teachers/{id}` | 204 |
| Set an arm's form teacher, or none | `PUT /v1/arms/{armId}/form-teacher` `{ userId \| null }` | 204 |
| Set a teacher's whole list of subject classes | `PUT /v1/teachers/{id}/subject-classes` `[{ armId, subjectId }]` | 204 |
| One arm's register for a day (default: the latest school day), with this term's days and whether each was taken | `GET /v1/arms/{armId}/register?date=` | `Register` |
| Save a register | `PUT /v1/arms/{armId}/register` `{ date, marks: [{ studentId, mark, note? }] }` | `{ present, absent }` |
| A teacher's home: their form classes (taken today? days taken this term) and subject classes | `GET /v1/me/teaching` | `TeacherHome` |
| The students in one subject class | `GET /v1/arms/{armId}/subjects/{subjectId}/students` | `SubjectClass` |
| Home card for admins: today's registers in, and which are missing | `GET /v1/registers/today` | `RegistersToday` |

**Done when.** A form teacher signs in, takes today's register, fixes yesterday's, and can't open
any admin screen; a subject-only teacher sees their subject classes and no register.

### C2. Parents

**Problem.** Parents want to follow their own children: attendance now, results later (C6).

**Who.** A new role, `parent`. A parent's account is linked to one guardian record (B2). Every
parent endpoint returns only that guardian's children. Parents are refused by admin and teacher
endpoints.

**Endpoints we need.**

| What | Suggested | Returns |
|---|---|---|
| Parents page: guardians with children here, their email and phone, and access (`none`, `invited`, `active`) | `GET /v1/parents` | `ParentsPage` |
| Invite one guardian (needs an email on their record) | `POST /v1/guardians/{id}/invite` | 201 |
| Invite every guardian with an email who isn't invited yet | `POST /v1/parents/invite-all` | `{ invited, withoutEmail }` |
| End a guardian's access, or cancel their invite (records stay) | `DELETE /v1/guardians/{id}/access` | 204 |
| A parent's home: each child with class, admission number, form teacher, this term's attendance and the last ten school days' marks (without the register's notes) | `GET /v1/me/children` | `ParentHome` |

**Done when.** A parent signs in and sees only their own children; they can't open another
child's page by changing the address.

### C3. The team console

**Problem.** The Brillianda team needs to look after schools: see who signed up, pause a school,
and follow up trial requests from the website.

**Who.** Team accounts, separate from school accounts, signing in on the main site at
`/console`. Every console endpoint refuses anyone else.

**Rules.**

- Looking at a school's summary writes a line to **that school's** change history, so the school
  can see that staff looked (at most once an hour per team member). Summaries are counts and
  contacts, never a student's own record.
- Pausing or reactivating a school needs a reason (3 to 200 characters), which the school sees
  in its history. A paused school's people can't sign in. Nothing is deleted.
- Trial requests have a status (`new`, `contacted`, `converted`, `declined`) and a team note.

**Endpoints we need.**

| What | Suggested | Returns |
|---|---|---|
| Sign in and out; who is signed in | `POST /v1/team/login`, `POST /v1/team/logout`, `GET /v1/team/me` | `TeamMember` |
| Overview: schools active, paused and new this week; students; trial requests waiting; newest schools; recent activity | `GET /v1/team/overview` | `ConsoleOverview` |
| Every school: status, owner, students, classes, setup progress, joined | `GET /v1/team/schools` | `ConsoleSchool[]` |
| One school's summary (logged, see rules) | `GET /v1/team/schools/{subdomain}` | `ConsoleSchoolDetail` |
| Pause or reactivate | `PUT /v1/team/schools/{subdomain}/status` `{ status, reason }` | 204 |
| Trial requests, newest first | `GET /v1/team/trial-requests` | `TrialRequestRow[]` |
| Set a request's status and note | `PATCH /v1/team/trial-requests/{id}` `{ status, note }` | 204 |

### C4. Results: settings and score entry

**Problem.** Subject teachers enter each student's scores every term; admins follow progress and
handle mistakes.

**What to store.**

- Per school: the score parts (by default **CA1 20, CA2 20, Exam 60**; they must add up to 100),
  the grading scale (by default **A to F**, see D), and whether positions are shown.
- Per student, part, subject, arm and term: a score, or absent (`ABS`).
- Per sheet (arm, subject, term): in progress or complete; unlock requests with a reason.
- Per student and elective subject: "doesn't take this subject".

**Rules.**

- A term is identified as `<session start year>-<term number>`, e.g. `2026-1`. Results open for
  the session's first term that isn't closed, once it has started (C7).
- A score is empty, `ABS`, or a number from 0 to the part's marks, up to 2 decimals.
- The score parts can't change once any score is in for the term.
- A sheet can be marked complete only when every student who takes the subject has every part
  filled. A complete sheet is locked for the teacher. The teacher can ask to unlock it with a
  reason (5 to 200 characters). An owner or admin approves (it reopens) or declines, and can
  reopen it without a request.
- Marking a student as not taking an elective clears their scores on that sheet.
- Totals and grades must match ours exactly (D).

**Endpoints we need.**

| What | Suggested | Returns |
|---|---|---|
| Results settings | `GET` / `PUT /v1/results/settings` | parts, scale, showPositions, scoresEntered |
| Overview: each class's sheets (complete, in progress) and open unlock requests | `GET /v1/results` | per our `getResultsOverview` |
| One class's sheets with teacher, status and progress | `GET /v1/arms/{armId}/sheets` | per `getArmSheets` |
| A teacher's own sheets this term | `GET /v1/me/sheets` | per `getMySheets` |
| One sheet: parts, scale, status, each student's scores and whether they take it | `GET /v1/arms/{armId}/subjects/{subjectId}/sheet` | per `getScoreSheet` |
| Save one score | `PUT …/sheet/scores` `{ studentId, componentId, raw }` | the sheet's status |
| Doesn't take this elective (or does again) | `PUT …/sheet/excluded` `{ studentId, excluded }` | 204 |
| Mark complete | `POST …/sheet/complete` | 204, or 409 with the reason |
| Ask to unlock | `POST …/sheet/unlock-request` `{ reason }` | 204 |
| Approve, decline, or reopen | `POST …/sheet/unlock` `{ approve }` | 204 |

**Who.** The subject's teacher for their own sheets (not once complete); owners and admins for
all.

### C5. Results: broadsheet, remarks, ratings, publishing, report cards

**Problem.** Before parents see results, the school checks each class's broadsheet, adds remarks
and ratings, and publishes.

**What to store.**

- Per student and term: the class teacher's remark and the principal's remark (each up to 300
  characters).
- Per school: behaviour ratings on or off, and the list of traits (by default Punctuality,
  Neatness, Attentiveness, Politeness, Teamwork; at most 12, each up to 30 characters).
- Per student, trait and term: a rating from 1 to 5 (Poor, Fair, Good, Very good, Excellent).
- Per arm and term: published or not.

**Rules.**

- The class teacher's remark: the arm's form teacher or an admin. The principal's remark: owner
  or admin.
- An arm can be published only when every subject's sheet is complete. Publishing can be taken
  back.
- Average: the mean of the student's complete subject totals. Position: within the arm, ties
  ranked 1, 2, 2, 4 (D).

**Endpoints we need.**

| What | Suggested | Returns |
|---|---|---|
| Broadsheet: subjects with status; each student's total and grade per subject (or "doesn't take it"); average; position when shown; published | `GET /v1/arms/{armId}/broadsheet` | `Broadsheet` |
| Remarks and ratings for the class, and the school's traits | `GET /v1/arms/{armId}/reports` | `ClassReports` |
| Save a remark (empty clears it) | `PUT /v1/arms/{armId}/students/{studentId}/remarks/{teacher\|principal}` `{ text }` | 204 |
| Save a rating | `PUT …/students/{studentId}/ratings` `{ trait, value }` | 204 |
| Rating settings | `GET` / `PUT /v1/results/ratings` `{ enabled, traits }` | 204 |
| Publish or unpublish | `PUT /v1/arms/{armId}/published` `{ published }` | 204, or 409 with the reason |
| A student's report card, for this term or a past one | `GET /v1/students/{id}/report-card?term=` | `ReportCardData` |

**Who.** Owners and admins for all; the form teacher for their own arm (read the broadsheet,
write the class teacher's remark and ratings).

### C6. Parents see results

**Problem.** Parents should see results once, and only once, the school publishes them.

**What we need.**

- On each child in the parent's home: this term's name and, once the class is published, the
  average, position (when the school shows positions) and class size; plus the past terms whose
  results were published.
- The report card for the parent's own child, for a published term only:
  `GET /v1/me/children/{studentId}/report-card?term=` → `ReportCardData`. Anything else answers
  "not found".

### C7. Closing a term

**Problem.** A term's results stay open until the school says it's finished, not when the end
date passes.

**Rules.**

- Closing a term locks its scores, keeps its results and publishing, drops open unlock requests,
  and can change the next term's dates.
- It's refused while any class is unpublished, unless the admin confirms "close anyway".
- The session's last term isn't closed here: promotion closes it (C8).
- Report cards for a past term use the class the student was in that term.

**Endpoints we need.**

| What | Suggested | Returns |
|---|---|---|
| Term status: the open term, the term after it (with dates), the next term when none is open, unpublished classes, closed terms | `GET /v1/terms/status` | `TermStatusData` |
| Close the open term | `POST /v1/terms/close` `{ closeUnpublished, nextStartsOn?, nextEndsOn? }` | 204, or 409 |
| Every term a student has results for, newest first | `GET /v1/students/{id}/report-terms` | `ReportTerm[]` |

### C8. Promotion at the end of the session

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

### C9. Birthday messages

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

On the parent's home (C2), each child gains `birthday`: the filled-in message on the child's
birthday when the school sends them, otherwise `null`. Rules: `packages/core/src/birthdays.ts`.

### C10. Books and things needed

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

On the parent's home (C2), each child gains `bookLists`: `[{ label, list }]`. Rules:
`packages/core/src/booklists.ts`.

### C11. Student details for parents, and corrections

**Problem.** Parents should see what the school has on record for their child, and ask for
mistakes to be fixed without visiting the office.

**What we need.**

- On each child in the parent's home (C2), `details`: first, other and last names, date of birth,
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

### C12. Timetable

**Problem.** Schools need one timetable everyone works from. Admins set it; teachers see it, with
their own lessons highlighted.

**What to store.**

- Per school, the bell schedule: periods in order, each with an id, a name, start and end times
  (`HH:MM`) and a kind (`lesson` or `break`). The same for every class, Monday to Friday.
- Per class, day (1 to 5) and lesson period: a subject.
- Optionally, one timetable document per school (a PDF up to 2 MB), in file storage.

**Rules.**

- A lesson's teacher isn't stored: it's the class's teacher for that subject (C1).
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

---

## D. Rules both sides must share

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
| `birthdays.ts` | Filling in the message, ages, 29 February, the coming birthdays, how many texts a message takes |

The default scale: A 70+, B 60+, C 50+, D 45+, E 40+ (all passes), F below 40.

---

## E. What the front end already relies on

Please tell us before changing any of these.

**How we call you.** Browsers never call the API. Our server calls it with:

- `x-forwarded-host`: the school's address. On staging, which has no school subdomains,
  `<school>.api-rouge-nine-18.vercel.app`, with a matching `Origin` on writes;
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
- Change history: `GET /v1/changes`
- Website: `POST /v1/trial-requests`
