# Handoff (29 October 2026)

For the next agent working on Brillianda-web. Read `CLAUDE.md` first; it has the house rules.

## Ground rules

- Work only in `Brillanda-web`; push to `main` of github.com/Tochi-Nwachukwu/BrilliandaWeb.
  `brillanda-backend` and `brillanda-v1` are read-only (fetch to read the API notes, never edit).
- Front end only. Stage files by name, never `git add -A`; leave `AGENTS.md` uncommitted.
- Secrets live in `.env.local` only (`API_PROXY_SECRET`, `MAIL_OUTBOX_KEY`). Never commit or echo.
- Keep tests few; the user often asks for none. `pnpm typecheck` + `pnpm lint` at least.
- Builds sometimes stop on a Next.js "security vulnerability" notice: retry once. Don't run the
  upgrade command it prints; the upgrade is waiting on the user's go-ahead.

## How it fits together

- `src/data/*.ts` wrappers pick `src/data/api/*` (DATA_SOURCE=api) or `src/data/fake/*` (sample
  data, used by the browser tests). Screens import wrappers only.
- The backend is a separate Hono API. Its contract: `https://api-rouge-nine-18.vercel.app/openapi.json`;
  its change notes: `brillanda-backend` branch `revamp/v1-backend`, `docs/frontend-integration.md`.
- `src/proxy.ts` maps `<school>.<ROOT_DOMAIN>` to `/s/<school>/…`, forwards `/api/*`, and redirects
  the API's `?school=` email links. Links inside a school use `schoolBase()` / `useSchoolBase()`.
- Staging: https://staging.brillianda.com (Vercel project `brillianda-web`, region lhr1, next to
  the API). Deploy: `npx --yes vercel@latest deploy --prod --yes`, then `git checkout -- .gitignore`.

## Done

Every screen is on the API, including the question bank and CBT (28 October). Help guides and
tours, My profile, sidebar account card and logo, Teachers in the sidebar, loading outlines,
"← More" links. `docs/backend-requirements.md` lists the open backend asks (A1 to A3).

## To do

- Lesson notes for generating questions (paste, Word/text, photos, PDF) are built on our side;
  the backend part is `docs/backend-requirements.md` A3. Test it once AI is on.
- AI generating is switched off on the API (`aiEnabled: false` hides Generate) until Tochi picks a
  provider (`docs/ai-integration.md`, Step 0: Gemini's under-18 terms).
- Birthday texts need an SMS account (Termii); on staging they land in the outbox.
- Offered, not started: a "Send again" button for invited teachers; importing questions from
  Word/Excel; the console at `admin.brillianda.com` (the plan's address).
- Backend: the team account's name shows as "Full Name Here" in schools' change history.
- The Next.js security upgrade, when the user agrees.
