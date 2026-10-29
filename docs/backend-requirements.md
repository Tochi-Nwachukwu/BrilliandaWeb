# What the front end needs from the backend

From the Brillianda front-end team. Updated 26 October 2026: only what is still open.

This is the complete list, in one place. Each item says what the problem is, what we need, the
rules that matter, and how we'll know it's done. It is written from the screens' side only: we
test against the **staging API**, not your repositories. If something here already exists in
your development work, reply with the endpoint and we'll connect it.

**How to answer:** for each item, a short reply is enough: "done, here is the endpoint", "done
differently, here is why", or "not yet".

## Contents

- A. Open requests
- B. Rules both sides must share
- C. What the front end already relies on (please don't change without telling us)

---

## A. Open requests

None right now (29 October 2026). Everything we asked for is on staging. Still to switch on, not
backend work: AI generating (waiting on the provider decision, `docs/ai-integration.md` Step 0)
and birthday texts (an SMS account).

---

## B. Rules both sides must share

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

## C. What the front end already relies on

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
- Question bank: `GET`/`POST /v1/questions`, `POST /v1/questions/generate`, `PUT`/`DELETE /v1/questions/{id}`
- CBT: `GET`/`POST /v1/tests`, `GET /v1/tests/editor`, `PUT`/`DELETE /v1/tests/{id}`, `GET /v1/tests/{id}/results`,
  `PUT /v1/tests/{id}/attempts/{attemptId}/marks/{index}`, `POST /v1/tests/{id}/send-scores`, `GET /v1/me/tests`,
  `GET /v1/me/tests/{id}`, `POST …/start`, `PUT …/answers/{index}`, `POST …/left`, `POST …/submit`
- Change history: `GET /v1/changes`
- Website: `POST /v1/trial-requests`
