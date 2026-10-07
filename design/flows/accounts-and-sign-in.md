# How accounts and sign-in work

In plain English. Read this to understand how a person gets a Brillanda account and how they
sign in afterwards. For how the screens should look, see `design/patterns/auth.md`.

**The one rule: nobody registers themselves.** Every account is either created by us or invited
by someone at the school. There is no "Sign up" or "Create an account" anywhere in the product,
on purpose.

---

## 1. How people get an account

**Step 1. A school asks for a trial.**
The school fills in "Request a trial" on the landing page. This is the only way in from the
website. There is no sign-up button, because schools can't create themselves.

**Step 2. We set up the school.**
We create the school and its first school admin. Only Brillanda can create a school.

**Step 3. The admin invites their staff.**
The school admin adds a teacher by name and email. The teacher gets an email with a link. The
link works **once** and lasts **72 hours**.

**Step 4. The teacher opens the link and sets a password.**
They see "Set your password". They choose a password (at least 8 characters) and type it twice.
They are signed in straight away and land on their teacher pages.

If the link is old or already used, they see "This invite can't be used". They can't fix that
themselves. They have to ask their school for a new invite.

**Step 5. Parents get in one of two ways.**

- **Parents with an email** get an invite link, the same as teachers.
- **Parents without an email** get a printed **access code** on a slip, like `K7QM-2XPA-9RTD`.
  They type it on the sign-in page and never need a password. This only works if the school has
  switched access codes on.

**Step 6. Students** can sign in to see their own published results, but only if the school turns
that on. It is off by default.

---

## 2. How people sign in afterwards

| Who | What they do |
|---|---|
| Teacher, school admin, parent with an email | Go to the sign-in page, type email and password |
| Parent with an access code | On the sign-in page, click "Use your code" and type the code. Capital letters, spaces and dashes don't matter |
| Anyone who forgot their password | Click "Forgot your password?", type their email, and follow the link we send. The link lasts **1 hour**. Using it signs them out of every other device |

There is **one sign-in page for everyone**. After signing in, each person goes to their own area:

| Role | Goes to |
|---|---|
| School admin | The admin area |
| Teacher | The teacher area |
| Parent or student | The parent area |
| Brillanda staff | The super-admin area |

Someone can't open another role's area by typing its address. They are sent back to their own.

---

## 3. Safety rules

- **Wrong password and unknown email look the same.** Both show "That email and password don't
  match." Otherwise the form could be used to find out who has an account at a school.
- **"Forgot password" gives the same answer whether the email exists or not:** "If that email is
  on file, a reset link is on its way."
- **One email is one account across all of Brillanda.** A person at two schools needs a different
  email for each.
- **Sessions end.** After 24 hours of doing nothing, or 30 days at the most, a person signs in
  again.
- **Links and codes are stored scrambled**, and a code is shown once, when the school prints it.

---

## 4. What works today, and what doesn't

**Works now**

- The sign-in, parent access, set-password, forgot, reset and confirmation screens.
- The backend for signing in, invites, resets and access-code sign-in.

**Not built yet**

- **The trial-request endpoint.** For now the form keeps the request in the visitor's own browser
  (DECISIONS.md D-12).
- **Creating a school.** Nothing in the product does this yet.
- **Admin screens for inviting people.** The backend can send an invite; there is no screen for it.
- **Issuing printed access codes.** The code generator exists, but nothing hands the codes out yet.

Until those exist, accounts have to be created through the seed data.

---

## 5. Where this lives

| What | Where |
|---|---|
| Why there is no self sign-up, and the trial form | `DECISIONS.md` D-12, and BRD FR-6.1 |
| Email invites and printed access codes for parents | `DECISIONS.md` D-5 |
| One account per email | `DECISIONS.md` D-4 |
| The sign-in screens | `apps/web/src/shared/auth/` |
| The sign-in backend | `apps/api/src/modules/auth/` |
| Inviting a user | `apps/api/src/modules/users/` |
