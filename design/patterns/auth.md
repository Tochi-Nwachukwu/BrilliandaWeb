# Design pattern: the sign-in screens

How the app's entrance should look and behave, drawn from the marketing site we built in
`apps/site` (draft C). It covers every screen a person meets before they have a session.

The site sells; these screens are the handover. Someone arrives from a page with big photographs
and cinematic motion, and lands on a form. It should feel like the same company without pretending
to be the same kind of page: the site is read once, these screens are used under pressure, on a
phone, on school wi-fi, often by someone who was sent a link and doesn't know what Brillanda is.

Read this alongside `DECISIONS.md` (D-9 to D-13) and Build Guide §6.

---

## 1. There is no register page

Worth saying first, because "login/register" is the usual pair and here it isn't.

Schools do not sign themselves up. A school is created by us after a request (BRD FR-6.1,
DECISIONS D-12), and people inside that school are invited by their admin. So the screens that
actually exist are:

| Screen | Who reaches it | How |
|---|---|---|
| **Sign in** | everyone with an email | `/login` |
| **Parent access** | parents with no email address | same page, toggled (D-5) |
| **Set your password** | anyone opening an invite | emailed link, valid 72 hours |
| **Forgot password** | anyone | link from sign in |
| **Choose a new password** | anyone with a reset link | emailed link |
| **Password changed** | after a successful reset | confirmation, not a form |

The nearest thing to "register" is **Request a trial**, and it lives on the marketing site, not in
the app. The app never offers it — a stray "Create an account" link would promise something the
product cannot do.

Current code: `apps/web/src/shared/auth/` — `AuthLayout.tsx`, `LoginPage.tsx`, `PasswordPages.tsx`.
The structure is already right. What follows is how it should look.

---

## 2. What carries over from the site, and what doesn't

**Carries over**

- The warm paper palette and the single ochre accent.
- The display face, for the wordmark and the screen's one heading.
- Card depth: an edge plus a three-layer shadow.
- One entrance animation, and a page that is complete without it.
- Plain-spoken copy. No "Welcome back, superstar!".

**Stays behind**

- Photographs. The entrance is a room, not a poster; a background photo behind a form costs
  bandwidth and makes the fields harder to read.
- The intro screen, the custom cursor, magnetic buttons, parallax, the pinned tour. All of it is
  for a visitor being persuaded. A teacher signing in at 7am is not being persuaded.
- Counters and animated figures. Nothing here is a statistic.

The rule: **the site performs, the app responds.** Motion in the app exists to explain what just
happened, never to impress.

---

## 3. Tokens

The site's tokens live in `apps/site/src/styles/tokens.css`. Bring these into
`apps/web/src/styles/tokens.css` — they replace the graphite neutrals, and because
`tailwind.config.ts` maps every colour to a variable, the rest of the app follows automatically.

```css
:root {
  /* paper, not white: the card has something to sit on */
  --color-bg: #faf9f7;
  --color-surface: #ffffff;
  --color-sunken: #f0eeea;

  --color-border: #e4e1dc;        /* section rules, field edges */
  --color-border-strong: #ccc8c1; /* hover */
  --color-edge: #dcd8d1;          /* a card's own edge, one step firmer */

  --color-text-primary: #16171a;
  --color-text-secondary: #5c5f66;
  --color-text-muted: #95989e;

  --color-primary: #16171a;       /* the solid button: ink, near-black */
  --color-primary-hover: #000000;
  --color-primary-text: #faf9f7;
  --color-accent: #c8913a;        /* ochre: focus rings, the wordmark dot, one rule */

  /* status colours are unchanged — a grade badge must mean the same thing everywhere */

  /*
   * Three layers, warm-tinted. One wide blur reads as a flat rectangle with a smudge under it;
   * the hairline is what makes the card sit on the page.
   */
  --shadow-raised:
    0 1px 1px rgba(38, 30, 20, 0.05),
    0 3px 7px -2px rgba(38, 30, 20, 0.055),
    0 16px 34px -14px rgba(38, 30, 20, 0.13);
}
```

Dark mode is a separate decision. The site has it; the app does not yet. Don't add it here alone —
half a themed app is worse than none.

---

## 4. Type

The app ships **no webfonts** (Build Guide §6), on purpose: it is used all day on slow connections.
The site uses Outfit. So the entrance has a choice to make, and it needs your sign-off:

> **Open decision.** Load Outfit on the auth screens only — subset to the handful of weights and
> characters a heading uses — or keep the system stack everywhere and accept that the app looks
> plainer than the page that sent you there.
>
> **Recommendation: load it, scoped to these screens.** It is one screen, seen once per session,
> and the face is used for roughly six words. Subset to weights 400/500 it costs well under 20 KB,
> it is cached for every later visit, and the wordmark is the one place continuity is worth paying
> for. Everything else on the screen — labels, fields, errors, buttons — stays on the system stack,
> which is what makes it cheap.
>
> If the answer is no, use the system stack throughout and set the wordmark in 500 weight with
> `letter-spacing: -0.04em`. It will be fine. It will not be ours.

Either way:

| Element | Face | Size | Weight |
|---|---|---|---|
| Wordmark | display | 20px | 500 |
| Screen heading | display | 26px | 500 |
| Description under it | body | 14px | 400, `--color-text-secondary` |
| Field label | body | 14px | 500 |
| Field input | body | **16px** | 400 |
| Error / hint | body | 14px | 400 |
| Button | body | 14px | 500 |
| Footer line | body | 14px | 400 |

**16px on inputs is not negotiable.** Anything smaller makes iOS Safari zoom the page on focus, and
the person loses their place in a form they are already unsure about.

---

## 5. Layout

**Under 1024px:** one column, centred, on a paper background. Nothing else on the screen. The
person came here to do one thing, usually on a phone, and every extra line is bandwidth.

**From 1024px up (revised 2026-09-21):** a split screen. An ink brand panel fills the left 5/12
(sticky, full height); the form sits on paper in the right 7/12 and loses its card box, since the
panel already gives the screen its structure. The wordmark moves into the panel. The panel is
text and CSS only — the headline from the site, and three steps in the order the product does
them (teachers enter scores, Brillanda does the sums, parents read the result). **No figures:**
nothing on it is a statistic, so nothing needs a source. No photographs, no product screenshot,
no motion of its own. It never renders on a phone, so it costs a phone nothing.

The diagram below is the card layout; on wide screens read it as the right-hand column.

```
            ● Brillanda            ← wordmark, ochre dot, links to the site

    ┌──────────────────────────┐
    │                          │
    │  Sign in                 │   ← heading, display face
    │  Use the email your       │   ← one line of description, or none
    │  school added you with.   │
    │                          │
    │  Email                   │
    │  [                    ]  │
    │                          │
    │  Password                │
    │  [                    ]  │
    │              Forgot it?  │   ← right-aligned, under the field
    │                          │
    │  [      Sign in       ]  │   ← full width, solid
    │                          │
    └──────────────────────────┘

      Parent with an access code?
      Use your code                ← outside the card, quieter
```

- Card: `max-width: 400px`, `border-radius: 12px`, `1px solid var(--color-edge)`,
  `box-shadow: var(--shadow-raised)`, padding 32px (24px under 480px wide).
- Vertically centred with `min-height: 100dvh` — `dvh`, not `vh`, or a phone's address bar crops
  the button.
- Wordmark 40px above the card; the footer line 24px below it.
- On a phone the card keeps its edges and shadow. Don't stretch it edge to edge — the border is
  what says "this is a thing you fill in", and it survives a bright classroom better than white
  on white.

The existing `AuthLayout` already takes `title`, `description`, `children` and `footer`. Keep that
shape; only its styling changes.

---

## 6. Fields

`TextField` is already correct: label above, 44px minimum height, 16px text, `aria-invalid` on
error, error and hint sharing one `aria-describedby` slot. Restyle, don't rewrite.

- Resting: white fill, `1px solid var(--color-border)`.
- Hover: border to `--color-border-strong`.
- Focus: border to `--color-accent`, plus a 1px ring of the same. One ochre ring is the only
  colour on the screen at rest.
- Error: border and text to `--color-danger`, fill to `--color-danger-bg`.
- Never put the label inside the field as a placeholder. It disappears exactly when it is needed,
  and it breaks password managers.

**The password field gets a show/hide toggle.** People mistype passwords on phone keyboards, and
the alternative is a failed sign-in they can't explain. The toggle is a button inside the field's
right edge, labelled `Show password` / `Hide password` for screen readers, never an unlabelled eye.

**The access-code field** (parents) is one input, not six boxes. Boxes look tidy and are miserable
to paste into, and the code arrives on a printed slip that gets typed by hand. Accept it in any
case, strip spaces and dashes before sending.

---

## 7. Buttons

One solid button per screen, full width, the thing you came to do. Everything else is a text link.

- Solid: ink background, paper text, `border-radius: 10px`, minimum height 44px.
- The site's sweeping hover fill does **not** come across. Here a button changes colour on hover
  and that's all.
- **Loading state matters more than it looks.** On a slow line, sign-in can take seconds. The
  button shows a spinner and the label changes to `Signing in…`, and it is disabled while in
  flight. `Button` already supports `loading`; use it. Without it people press twice.

---

## 8. Errors, and what they're allowed to say

This is where an auth screen is won or lost.

- **Field errors sit under their field**, from the server's `fields` map. `ApiError` already
  carries it and `fieldError()` already reads it.
- **A general error sits above the button**, in an `Alert`, only when the server didn't name a
  field — `generalError()` already makes that distinction. Never show both for one failure.
- **A wrong password and an unknown email give the same message**: *"That email and password don't
  match."* Naming which one was wrong tells an attacker which emails exist at the school.
- **Forgot password always says the same thing**, whether or not the address is on file: *"If that
  email is on file, a reset link is on its way."* Same reason.
- **Say what to do next.** A rate-limited sign-in says how long to wait. An expired invite says to
  ask the school for a new one — and gives no way to self-serve, because there isn't one.
- **Never blame the person.** "Check this email address", not "Invalid email".

Every message in plain English, no jargon, no error codes on screen.

---

## 9. Motion

One entrance: the card rises 8px and fades in over ~420ms. That's the `rise` animation already in
`tailwind.config.ts`. Nothing else moves on arrival.

After that, motion only reports something:

- the button's spinner while a request is in flight
- an error appearing (fade, ~150ms — fast; it's information, not decoration)
- the card's height changing when an error pushes the button down (transition the height, or it
  jumps under the finger)

All of it inside `@media (prefers-reduced-motion: reduce)` guards. With motion reduced the screen
is simply there, complete, immediately — same as every other surface we've built (D-11).

---

## 10. Copy

- Sentence case everywhere. Not Title Case, not ALL CAPS.
- The heading is a noun or a short instruction: "Sign in", "Set your password", "Parent access".
- At most one line of description, and only if it earns its place. "Use the email your school
  added you with" earns it: it tells a teacher which of their addresses to try.
- Say "school" wherever possible — that is who these people answer to. Not "organisation",
  not "workspace", not "tenant".
- Nigerian English. "Sign in", not "Log in" (pick one and hold it — the current code says "Log in";
  the site's nav says "Sign in"; **make them both "Sign in"**).

---

## 11. Accessibility and the things that get forgotten

- Every field has a real `<label>`; the form is a real `<form>` that submits on Enter.
- `autocomplete` set properly: `email`, `current-password`, `new-password`. Password managers are
  how a lot of people will actually get in.
- Focus is visible on everything, at 3:1 against its background.
- On submit failure, focus moves to the first bad field, and the error is announced —
  `aria-live="polite"` on the alert.
- Contrast: `--color-text-secondary` on `--color-surface` passes; `--color-text-muted` is for
  decoration only, never for an error or an instruction.
- The whole screen works at 320px wide and at 200% zoom.

---

## 12. Budget

These screens load before anything is cached, often on a phone on school wi-fi (NFR-11).

- No photographs, no illustrations, no icon font. The only image is the wordmark dot, which is CSS.
- CSS and JS for the auth route under 40 KB gzipped, excluding the framework.
- If the webfont decision is yes, it is subset and `font-display: swap`, and the screen is legible
  before it arrives.

---

## 13. Checklist

- [x] No route, link or copy anywhere offers self sign-up
- [x] Sign in, parent access, invite, forgot, reset and confirmation all use one layout
- [x] Wrong password and unknown email are indistinguishable
- [x] Forgot password reveals nothing about which addresses exist
- [x] Password field has a labelled show/hide toggle
- [x] Access code is a single input and tolerates spaces, dashes and any case
- [x] Submit button disables and shows its spinner while in flight
- [x] Field errors under fields, general errors above the button, never both
- [x] Inputs are 16px and at least 44px tall
- [x] One entrance animation; nothing moves under reduced motion
- [x] Works at 320px and at 200% zoom
- [x] "Sign in" used consistently, in the app and on the site
- [x] Screenshots taken at 390px and 1440px before it is called done
