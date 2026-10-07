# Dashboard drafts

`index.html` holds three drafts of the home screen for every portal (school admin, teacher,
parent, Brillanda team), switchable in one page. Open it in a browser; it needs no build.
All data in it is sample data.

| Draft | Idea | Wow comes from |
|---|---|---|
| **A. Paper** (clean) | Greeting, one number, a "Needs you" list, then detail. | Type, spacing, and the morphing "Mark complete" button (button → loader → check → toast). |
| **B. Constellation** (abstract) | The term drawn as data on an ink canvas: every arm × subject is a mark (shape = subject group, fill = progress), and complete neighbours join into lines. Teachers get register rings; parents get a result emblem; the team sees schools as filled circles. | One picture that answers "where are we?" before any reading. |
| **C. Term spine** (mixture) | A results-cycle spine (Term opens → Scores in → Review → Publish → Parents read) with a liquid pill whose edges ride different springs, a written briefing that changes per stage, Bauhaus-style blocks that fill with each figure, and a rounded heatmap. | The spine and the briefing sentence. |

**Recommendation:** C as the frame for every role, B's constellation as the admin's drill-down
view, and A's rules for type, spacing and motion everywhere.

## Rules all three follow
- Tokens from `apps/web/src/styles/tokens.css`, plus a dark set and an ink canvas for B.
- Status colours are dots and fills only; text on tints stays in the primary text colour (F-34).
- Hand-built SVG charts (S-10), with tooltips, labels for screen readers, and a legend where shapes carry meaning.
- Springs with at most a tiny overshoot; no bouncy easing, particles, glows or gradients on UI chrome.
- Everything is complete under `prefers-reduced-motion`.
- "Coming soon" modules are shown honestly (D-13).
- Every screen also works at phone width, and the "Day one" toggle shows each home before any score exists.

## Open decisions before building in `apps/web`
- **Fonts.** The drafts use Outfit + Instrument Sans (the site's pair). The app currently allows
  Outfit on the sign-in screens only (D-14) and the system stack elsewhere. Using Outfit for the
  dashboard's headings and big numbers would need a D-14 extension.
- **Dark mode.** The drafts have it; the app doesn't yet. `design/patterns/auth.md` §3 says to add
  it app-wide or not at all.
- **Endpoints.** The briefing, heatmap, reopen requests and trial funnel need data the API
  contract doesn't have yet. They'd get MSW stand-ins (D-7) and entries in DECISIONS.md.

## Research sources
- SaaSUI, 7 SaaS UI trends for 2026: https://www.saasui.design/blog/7-saas-ui-design-trends-2026
- SaaSFrame, anatomy of dashboard design: https://www.saasframe.io/blog/the-anatomy-of-high-performance-saas-dashboard-design-2026-trends-patterns
- Art of Styleframe, 4 dashboard layouts: https://artofstyleframe.com/blog/dashboard-design-patterns-web-apps/
- Design Spells: https://www.designspells.com
- Attio empty states: https://www.saasui.design/pattern/empty-state/attio
- SAFSMS: https://safsms.com/ and a roundup of Nigerian school software: https://infoguidenigeria.com/school-management-system-software/
- Mobbin and Saaspo refused automated access.
