# Adding AI to Brillianda: step by step

For the Brillianda team and the backend team, 15 October 2026. What we want AI for: a teacher
picks a subject, class and topics (and optionally a photo of a page), and gets draft questions for
a test, an assignment or an exam, which they check and edit before printing or using in CBT.

## Step 0. Settle whether we may use Gemini at all (do this before anything else)

**Google's terms forbid using Gemini in a service that under-18s are likely to use.** Brillianda
is used by students (the student portal and CBT), so this applies to us even if only teachers
ever press "Generate":

- Gemini API (Google AI Studio): "You also will not use the Services as part of a website,
  application, or other service … that is directed towards or is likely to be accessed by
  individuals under the age of 18." ([Gemini API terms](https://ai.google.dev/gemini-api/terms))
- Vertex AI (the Google Cloud route to the same models) has the same rule: Service Specific
  Terms, section 20(d), "Age Restrictions". ([Google Cloud Service Specific Terms](https://cloud.google.com/terms/service-terms))
- Google may suspend the account on a suspected breach (section 20(f)).

A developer asked Google this exact question (a general-audience app with an adults-only AI
feature) on Google's forum; there was no answer from Google at the time we checked
([thread](https://discuss.ai.google.dev/t/age-restrictions-in-gemini-api-terms-general-audience-app-rated-3-with-an-adult-only-ai-feature/179916)).

**Two ways forward. Choose one before building:**

1. **Ask Google in writing** (Google Cloud sales, or Google for Education) whether a teacher-only
   feature inside a school platform with a student portal is allowed, and get the answer in the
   contract. Until then, don't switch it on.
2. **Use Claude (Anthropic) instead.** Anthropic allows products used by minors, with safeguards:
   age-appropriate content filtering, monitoring, telling users they're dealing with AI, and
   following child-safety and privacy laws ([Usage Policy](https://www.anthropic.com/aup),
   [guidelines for organizations serving minors](https://support.claude.com/en/articles/9307344-responsible-use-of-anthropic-s-models-guidelines-for-organizations-serving-minors)).
   Our design already fits: only teachers use AI, no student data goes in, and a teacher reviews
   everything.

Have a lawyer read whichever terms we choose. Nigeria's Data Protection Act also applies to
student data. The rest of this guide is the same for either provider; where it differs, both are
given.

## Step 1. Account and billing

- **Gemini:** create a project in Google AI Studio and turn on billing (the paid tier). Never use
  the free tier: Google uses free-tier prompts to improve its products, and humans may read them
  ([terms](https://ai.google.dev/gemini-api/terms)). On the paid tier, prompts aren't used for
  that.
- **Claude:** create an organization at console.anthropic.com and add billing.
- Make **one key per environment** (staging, production), so a leak in one doesn't expose the other.

## Step 2. Keep the key on the backend

- The key lives only in the API's environment (`GEMINI_API_KEY`, or `ANTHROPIC_API_KEY`). It never
  reaches the front end, the browser or the repository. Browsers only ever talk to our API.
- Also add `AI_MODEL` (which model to use), so it can change without a code change.

## Step 3. The SDK

- Gemini: `npm install @google/genai` in the API. Calls go through `ai.interactions.create(...)`
  ([quickstart](https://ai.google.dev/gemini-api/docs/quickstart)).
- Claude: `npm install @anthropic-ai/sdk`. Calls go through `client.messages.create(...)`.
- Pin the version, and wrap the call in one small module (`lib/ai.ts`), so switching provider later
  touches one file.

## Step 4. Choose the model

Start with a fast, cheap model, and test a stronger one against it (Step 11):

| Provider | Start with | Compare with |
|---|---|---|
| Gemini | `gemini-3.8-flash` (stable) | a Pro model |
| Claude | Claude Haiku | Claude Sonnet |

A typical paper (25 questions with answers) costs well under ₦100 with either; see the price
table we made on 15 October.

## Step 5. Agree the question format first (shared with the front end)

- The front end defines the question and paper shapes as Zod schemas in
  `packages/core/src/questions.ts` (we build this with the CBT work): objective (options and the
  right one), theory (with a marking guide), fill-in-the-gap, true/false; marks, topic, difficulty.
- The API turns that schema into JSON Schema (`z.toJSONSchema(...)`) and asks the model to answer
  **only** in that shape: Gemini's `response_format` with `mime_type: "application/json"` and the
  schema ([structured output](https://ai.google.dev/gemini-api/docs/structured-output)); Claude's
  structured outputs or a tool with that input schema.
- Keep the schema simple: Gemini supports `type`, `properties`, `required`, `enum`, `items`,
  `minItems`/`maxItems`, `minimum`/`maximum` and `description`, and may refuse very large or
  deeply nested schemas.
- **Always check the answer with the same Zod schema** before returning it. If it fails, retry once;
  then give up with a clear error.

## Step 6. The endpoint

`POST /v1/questions/generate` (teachers for their own subjects, admins for any):

```json
{
  "purpose": "test",
  "subjectId": "…",
  "levelId": "…",
  "topics": ["Photosynthesis", "Respiration"],
  "notes": "Focus on the word equation",
  "counts": { "objective": 20, "theory": 5, "fillGap": 0, "trueFalse": 0 },
  "difficulty": "mixed",
  "image": null
}
```

Returns `{ questions: Question[], usage: { used, limit } }`. Nothing is saved: the teacher edits
the draft and saves the paper (a separate endpoint).

In order, the endpoint:

1. Checks who is asking, and that a teacher teaches that subject.
2. Checks the school's monthly allowance (Step 8).
3. Builds the prompt (Step 7).
4. Calls the model with a 60-second timeout.
5. Checks the answer (Step 5).
6. Records the usage.
7. Returns the questions.

Also `POST /v1/questions/regenerate` for one question (same inputs plus the question to replace),
and `GET /v1/ai/usage` → `{ used, limit, resetsOn }` for the admin's meter.

## Step 7. The prompt

- **System instruction (fixed, in code):**
  - who it's for: Nigerian teachers, the class level (e.g. JSS 2), the 2025 NERDC curriculum;
  - British English;
  - clear, unambiguous questions, each with one correct answer;
  - age-appropriate content;
  - the exact counts asked for;
  - answer only in the given format.
- **The teacher's part:** subject, class level, topics, notes, and the optional page photo.
- **Never send personal data:** no student names, no scores, nothing from a student's record. AI
  only ever sees subject matter.
- **Photo:** at most one image, JPEG or PNG. The browser shrinks it to about 1,600 px and under 2 MB,
  and it's sent inline (base64). The API doesn't store it.

## Step 8. Limits, so costs can't run away

- **Per school per month:** an allowance (say 300 generations), set per plan. At the limit, answer
  `429` with code `ai_quota_exceeded` and when it resets.
- **Per teacher:** a rate limit (say 10 a minute) against accidental loops.
- **A usage table:** school, user, when, model, input and output tokens (from the response's usage
  figures), purpose. This drives the meter, the bills and the alerts.
- Alert the Brillianda team at 80% of a school's allowance, and when total spend passes a set
  amount.

## Step 9. Errors

New problem codes, in the same RFC 9457 format as the rest of the API:

| Code | Status | When | The front end shows |
|---|---|---|---|
| `ai_quota_exceeded` | 429 | The school used its allowance | "Your school has used this month's question generations. They reset on 1 November." |
| `ai_unavailable` | 503 | The provider is down or timed out | "Generating didn't finish. Try again." (keeps the teacher's choices) |
| `ai_invalid_output` | 502 | The answer failed the format twice | Same as above |
| `ai_refused` | 422 | The provider's safety filter blocked it | "This topic couldn't be used. Try different words." |

## Step 10. Hosting

Generating takes 10 to 40 seconds. On Vercel, give the endpoint a long enough maximum duration
(60 seconds or more) and keep the 60-second model timeout under it. Later, streaming can show
questions as they arrive.

## Step 11. Test the quality before switching it on

1. Write 20 real requests: JSS and SS, five or six subjects, a few with page photos.
2. Run them on the cheap model and the stronger one.
3. Let two or three teachers mark the questions: usable as is, needs small edits, or wrong.
4. Pick the model that's good enough, and keep the 20 requests to re-run whenever the model or
   prompt changes.

## Step 12. Roll out

1. Staging key, with our test school.
2. One pilot school for two weeks, watching usage, costs and teachers' edits.
3. Production, with the monthly allowance per plan.

## Lesson notes (30 October 2026)

Teachers can give the generator their own notes three ways: paste text; add a Word (.docx) or text
file, which the browser reads (only text leaves the device); or add photos (up to 5, shrunk to 1600
px) or a PDF (up to 2 MB). Photos and PDFs go to `POST /v1/questions/notes`, where the model reads
them into text that the teacher corrects before generating. Nothing is stored. Photos and
notes go to the AI provider, so Step 0 applies to them too, and teachers are told to leave out
student names. Cost: a page of notes is about 1,000 tokens in, a photo about 1,500; against the
questions coming back it adds little. Backend request: `docs/backend-requirements.md`, A3.

## What the front end does (our side)

We build every screen on a fake generator (realistic sample questions after a short wait):
- the generate form;
- the waiting state;
- the edit and review screen;
- regenerating one question;
- the usage meter;
- every error above.

When `POST /v1/questions/generate` is on staging, we swap the fake for it in `src/data`. The
screens don't change.
