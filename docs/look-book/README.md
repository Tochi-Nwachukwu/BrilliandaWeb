# Look book: the app before the move

Full-page screenshots of every screen of the Vite app (tag `vite-final`), taken 2026-10-07 at the
plan's two test sizes: **360 × 800** (phone) and **1280 × 800** (laptop). Files are named
`<screen>-<width>.png`. Every screen moved to Next.js is screenshotted the same way and must match
before its batch counts as done (`docs/migration-plan.md`).

On phone shots the bottom tab bar appears at the 800 px mark, not at the bottom of the page: that's
how a full-page capture treats a fixed bar. New shots are taken the same way, so they compare fairly.

To retake them: run `vite-final` (`npm ci && npm run dev`) and use the capture script, which signs
in with each sample account and visits each path below.

## Screens

| Screen | Path | Account |
|---|---|---|
| site-home | `/` (site, port 5174) | none |
| auth-login | `/login` | none |
| auth-forgot-password | `/forgot-password` | none |
| admin-home | `/admin` | School admin |
| admin-classes | `/admin/classes` | School admin |
| admin-class-jss1a | `/admin/classes/arm-jss1a` | School admin |
| admin-sheet-jss1a-maths | `/admin/classes/arm-jss1a/sheets/subject-maths` | School admin |
| admin-publishing | `/admin/publishing` | School admin |
| admin-students | `/admin/students` | School admin |
| admin-students-left | `/admin/students?show=left` | School admin |
| admin-student-overview / -results / -history / -notes | `/admin/students/student-chiamaka?tab=…` | School admin |
| admin-import | `/admin/students/import` | School admin |
| admin-staff | `/admin/staff` | School admin |
| admin-settings-school / -numbers / -scale / -session / -look | `/admin/settings?tab=…` | School admin |
| admin-promotion | `/admin/session/promotion` | School admin |
| admin-home-neutral, admin-students-neutral | `/admin`, `/admin/students` in the Neutral look | School admin |
| newschool-welcome | `/admin/welcome` | New school (first run) |
| teacher-home, teacher-classes, teacher-score-entry | `/teacher`, `/teacher/classes`, `/teacher/score-entry/arm-jss1a/subject-maths/term-first-2026` | Teacher |
| parent-home, parent-results, parent-settings | `/portal`, `/portal/results`, `/portal/settings` | Parent |
| team-overview, team-schools, team-trials, team-activity | `/super-admin/…` | Brillanda team |

## Behaviour checklist

What each screen does, to tick off when it moves. Screens marked *later* are "after v1" in the plan
and move when their phase comes.

**App shell (every page)**
- [ ] Sidebar on laptop with the school card, nav items with counts, and a "Coming soon" note
- [ ] Bottom tab bar on phone; active tab highlighted
- [ ] Account menu: name, role, Look switch (Pastel / Neutral), sign out
- [ ] "Sample data" badge while on fake data
- [ ] Neutral look applied before first paint (no flash)
- [ ] Toasts at the bottom; dialogs centred; side panels slide in; Esc and click-outside close them
- [ ] Reduced motion respected

**Marketing site**
- [ ] Intro motion on first visit only; light and dark; mobile menu
- [ ] "Sign in" leads to the app's sign-in
- [ ] Trial form validates every field and shows a thank-you (becomes "Create your school" in v1)

**Sign-in**
- [ ] Email and password with show/hide; one error message for any wrong pair
- [ ] Parent access-code path (later)
- [ ] Forgot password, reset password, accept invite
- [ ] Sample-account buttons (become fake demo schools)

**Admin: Home**
- [ ] Greeting with date and term week; hero photo card
- [ ] Setup checklist for a new school (items, progress, Hide, links to the right tab)
- [ ] Four stat cards linking to their pages; Progress by class / Weekly switch; Needs you carousel
- [ ] First run for a new school: welcome, one class, try the grid (*replaced by v1 signup*)

**Admin: Classes**
- [ ] Junior and Senior groups that expand; filter by level; class cards with progress
- [ ] Class page: Subjects and Students tabs; read-only sheet; reopen requests; reminders (*results parts later*)

**Admin: Students**
- [ ] Current and Left tabs with counts; search by name or admission number; "No parent linked" filter
- [ ] Classes grouped and expandable; Expand all; Invite parent
- [ ] Enrol a student: next admission number previewed; Enrol and add another; field errors
- [ ] Student page: header actions (edit, move class, mark as left, readmit, invite parent, photo)
- [ ] Student page tabs: Overview, Results (*later*), History (classes by year, timeline), Notes (add, remove)
- [ ] Import: paste or CSV; column matching; check report with reasons; download rows to fix; import; result

**Admin: Staff, Settings, Session**
- [ ] Staff list; invite staff dialog
- [ ] Settings tabs in the address (`?tab=`): School (logo upload), Admission numbers (live preview), Grading scale (*later*), Session, Look
- [ ] Session: three terms with status; this term's dates; close a term with its warnings
- [ ] Promotion: counts, pass mark, per-student decisions with reasons, close the session (*later*)
- [ ] Publishing (*later*)

**Teacher, Parent, Brillanda team portals** (*all later*)
- [ ] Teacher home and classes; score sheet with keyboard moves, autosave, ABS, refused values
- [ ] Parent home with child switcher, results by term, report card
- [ ] Team overview, schools, trial requests, activity
