# M23 — AI Learning Coach

What the AI Coach is, how a question becomes an answer, and what it is allowed to do. Decisions and
their alternatives: [ADR-034](adr/adr-034-ai-learning-agent.md). Manual scenarios and results:
[m23-ai-evaluation.md](m23-ai-evaluation.md).

Status: the text coach is implemented and tested; the Gemini adapter was verified against the real
API on 2026-10-06 (five calls), and the 15-scenario evaluation was run against it the same day
(24 requests — **14 PASS, 1 N/A**, see [m23-ai-evaluation.md](m23-ai-evaluation.md)). Runtime use is
**authorised by the product owner** as of 2026-10-06, with the ADR-013 under-18 terms question still
unresolved and recorded as an accepted risk. Voice (Live API) is **not implemented** — a product
decision, not a technical blocker.

## What it is

A Gemini-powered coach that answers a learner's question _about their own learning in this
application_: why an answer was wrong, what to study next, what a word means, what a character said
in a video, how a sound is made — and that can write a short practice activity from the learner's
real weak points.

It is not a chatbot with the product's name on it. The difference is structural, not cosmetic:

| The model does                                 | The application does                                                         |
| ---------------------------------------------- | ---------------------------------------------------------------------------- |
| reasons, converses, chooses which tool to use  | owns identity, authorization, progress, lessons, exercises, scores, security |
| explains, adapts to the level, writes practice | decides what data exists and who may see it                                  |
| phrases the answer                             | validates every generated activity before it is shown                        |

The model has no database access, no filesystem, no HTTP, no SQL, no secrets, and no way to name a
user. It has sixteen typed tools and nothing else.

## Request flow

```
Browser (/learn/coach)
   │  POST /ai-coach/messages   { message, mode, language, history[], context? }
   │  session cookie — no user id, no level, no model, no prompt
   ▼
Fastify route (apps/api/src/routes/coach.route.ts)
   │  verifyOrigin → authenticate → per-user rate limit → strict contract schema
   ▼
resolveCoachContext (packages/application)          ← derives the CEFR level from the learner's
   │                                                  own progress; re-authorises the context id
   ▼
AskCoachUseCase (the orchestrator)
   │  1. validate the message and normalise the replayed history (domain)
   │  2. instructions for the mode + the tools that mode offers
   ▼
AiAgentService  ─────────────▶  GeminiAgentProvider (packages/data)  ──▶  Gemini Interactions API
   │  (port: no Gemini types)        the only file that knows the wire format        store: false
   │
   │  ◀── "call get_exercise_context(exerciseId)"
   │
   │  3. tool offered in this mode? arguments parse? → run it with the SESSION's user id
   ▼
Coach tools ──▶ existing use cases (M5–M22) ──▶ repositories / read model ──▶ PostgreSQL
   │                                                                          content/ files
   │  4. minimised result back to Gemini (at most 4 rounds)
   ▼
{ answer, mode, toolsUsed[], practice? }   ← allowlisting response schema
```

Every arrow into the application goes through code that already existed. The coach adds an
orchestrator, a provider adapter, a read model and a UI — not a second way to read learner data.

## Gemini integration

### What M12/M21 already had, and what M23 reuses

M12 built `AudioGenerationService` + `GeminiAudioProvider` for text-to-speech, used **offline** by
the media pipeline (M21/M22) to generate lesson and word audio. M23 reuses:

- the same endpoint and authentication (`POST …/v1beta/interactions`, `x-goog-api-key`),
- the same "plain `fetch`, no SDK" decision (ADR-013 §3) and the same explicit timeout/retry policy,
- the same provider-selection pattern (`*_PROVIDER` env var, a committed fake as the default,
  `gemini` refused under `NODE_ENV=test`),
- the same error-mapping discipline (a provider's words never reach a learner or a log),
- the same M18 provider decorator for metrics, and the same key-handling rules.

What changed: the endpoint constant, the retryable-status set, the backoff and the HTTP
classification moved into `packages/data/src/providers/gemini/gemini-interactions.ts`, now shared.
The TTS adapter's request body, response reading and error types are untouched, and its tests pass
unchanged — **the Hyperframes audio pipeline behaves exactly as before**.

What is new, because TTS and agentic conversation are different capabilities: tool declarations,
tool-call/tool-result steps, opaque step signatures, conversation replay, and `thinking_level`.

### Verified facts (2026-10-06)

Full list with sources in [ADR-034](adr/adr-034-ai-learning-agent.md). The ones that shaped the code:

| Finding                                                                                 | Consequence here                                                  |
| --------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| Interactions API is GA and recommended; function calling is documented on it            | one API for both capabilities                                     |
| `gemini-3.8-flash` is GA with function calling                                          | `AI_COACH_MODEL` default                                          |
| A call's identity arrives as **`id`** and is sent back as **`call_id`** (docs disagree) | resolved by a real call; the adapter reads `id`, writes `call_id` |
| A `function_call` step must be echoed back verbatim, `signature` included               | the continuation carries it as opaque state                       |
| `store: false` ⇒ the response has **no interaction id**                                 | `previous_interaction_id` is unusable; we replay the history      |
| `thinking_level: "low"` removed thought tokens entirely on an equivalent request        | set on every request — thought tokens bill as output              |
| Live API is GA (WSS, 15-min audio sessions, ephemeral tokens, function calling)         | voice is feasible; deferred by product decision                   |

## Tool architecture

A tool is a declaration (name, description, JSON Schema) plus a handler. The authorization rule is
in the types, not in a convention someone must remember:

```ts
execute(context: CoachToolContext, args: unknown): Promise<unknown>
//      ^ { userId, languageId, levelId } — userId comes from the session
//                               ^ untrusted: parsed before anything runs
```

No tool declares a `userId`, `studentId`, `teacherId` or `email` argument, so there is nothing for a
crafted tool call — or a learner's prompt — to put there. A handler cannot see a user id it was not
given.

### The sixteen tools

| Tool                        | Returns                                                                                             | Authorization                                                           |
| --------------------------- | --------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `get_learner_context`       | target language, derived CEFR level, instruction language, available levels                         | session user; no name, email, role or avatar                            |
| `get_progress_summary`      | lesson/attempt/vocabulary counts and points                                                         | session user's rows only (read model)                                   |
| `get_recent_activity`       | last ≤10 lesson/exercise events with titles                                                         | session user's rows only                                                |
| `get_weak_areas`            | attempted exercises worst-first, with counts                                                        | session user's rows only; this language's ids only                      |
| `recommend_next_activity`   | the learner's lessons with status + struggling exercises                                            | session user; `ListLessonsUseCase` (M6 visibility)                      |
| `list_lessons`              | lessons of a level with the learner's status                                                        | `ListLessonsUseCase` — M5/M6 visibility unchanged                       |
| `get_lesson`                | one lesson's blocks (≤12) and the learner's progress                                                | `GetLessonUseCase` — a hidden lesson is the same 404 as for the browser |
| `list_vocabulary`           | ≤15 entries with the learner's status                                                               | `ListVocabularyUseCase` (M9)                                            |
| `get_vocabulary_item`       | one entry in full + the learner's status                                                            | `GetVocabularyItemUseCase` (M9)                                         |
| `list_phonetics`            | ≤15 sounds with the learner's practice progress                                                     | `ListPhoneticsUseCase` (M10)                                            |
| `get_phonetic_information`  | one sound: IPA, description, examples                                                               | `GetPhoneticRepresentationUseCase` (M10)                                |
| `list_grammar_topics`       | the language's published topics                                                                     | `GrammarReferenceRepository` (ADR-033); published only                  |
| `get_grammar_topic`         | one topic's tables (≤20 rows) and examples                                                          | published **and** the learner's language, else "not found"              |
| `get_exercise_context`      | the question as presented, the learner's attempts, and the answer **only after they have answered** | `findVisibleExercise` (M7) + the learner's own attempts                 |
| `get_lesson_video_context`  | objective, target words, transcript (≤40 lines)                                                     | the lesson's own visibility is checked first (M21/M22 media)            |
| `propose_practice_activity` | validates an activity the model wrote; returns accepted/problems                                    | writes nothing; domain validation before the learner sees it            |

Every tool caps its own output; a 6,000-character backstop applies to the serialised result.

### The answer-key rule

`get_exercise_context` is the only tool whose output depends on what the learner has done:

- **No attempt** → the exercise as its own M7 presenter builds it (the exact object the browser
  gets), `correctAnswer: null`, and an instruction to guide rather than tell.
- **At least one attempt** → the same, plus the correct answer and the authored feedback — obtained
  by re-running M7's registered evaluator on the learner's **own stored answer**, so the key comes
  from the one authoritative evaluator and no answer-key logic is duplicated.

## Security model

| Concern             | How it is handled                                                                                                                                                                                                                                                                                                                                          |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Authentication      | `authenticate` hook (M3 session cookie). Both routes refuse without a session (401); classified by the M16 route inventory.                                                                                                                                                                                                                                |
| CSRF / cross-origin | `verifyOrigin` runs before the session on `POST /ai-coach/messages` — it is state-changing in the M16 sense because it spends money.                                                                                                                                                                                                                       |
| IDOR                | The learner comes from `request.currentUser`. The request schema is strict and has no user field; tool schemas have none either; the read model's every statement binds one user id. Tested: another learner's rows are never read, and a body naming a user is a 400.                                                                                     |
| Prompt injection    | Treated as untrusted input, not defended by instructions: the learner's text is passed as learner input (never concatenated into the instructions), and the _capability_ surface is the tool map. "Call a tool for another user" has nowhere to put the user; "show the hidden answer" is refused by the attempt check; "give me the API key" has no tool. |
| Tool validation     | Name must be in the current mode's set; arguments parsed field by field; unexpected arguments refused rather than ignored; a failure becomes `{ error }` for the model, never an HTTP failure or a leaked domain message.                                                                                                                                  |
| Secrets             | The key is a server-side env var, sent only in `x-goog-api-key`, never logged, returned, persisted or put in a URL/body. Tested.                                                                                                                                                                                                                           |
| Rate limiting       | Per user 20/hour (`perUserRateLimit`), per address 30/hour, plus ≤2 concurrent turns per process. A learner meets our limit, not the provider's.                                                                                                                                                                                                           |
| Data minimisation   | Tool results are allowlists with capped lengths; the response is parsed through an allowlisting schema (usage and instruction version never leave the API).                                                                                                                                                                                                |
| Error disclosure    | `coach-error.mapper.ts` maps to 422/502/503/504 with fixed messages; a misconfiguration is deliberately indistinguishable from an outage.                                                                                                                                                                                                                  |

**Prompt instructions are not a security boundary.** Every "never" in the instruction module is also
true of the code.

## Conversation model

Multi-turn, with the transcript held in the **browser** and replayed on each request:

- The client sends `history: [{ role, text }]` — only `learner` and `coach` **text**. A crafted
  history cannot forge tool output, replay a model signature or impersonate the application.
- The domain caps it: 12 turns, 2,000 characters per turn, oldest dropped first.
- `store: false` on every Gemini request, so the provider retains nothing and (verified) returns no
  interaction id — which is why `previous_interaction_id` is not used.
- **Nothing is persisted**: no table, no `localStorage`, no query cache entry. Closing the tab ends
  the conversation, and the page says so.

Modes (`explain`, `practice`, `conversation`, `vocabulary`, `lesson-help`, `video-help`,
`pronunciation`) select the instruction paragraph and the tool set. Contextual entry points open the
matching mode.

## Educational behaviour

The instructions (`AI_COACH_INSTRUCTIONS_VERSION = "ai-coach-v1"`,
`packages/application/src/coach/instructions/`) encode the M22 framework rather than the model's
instincts: retrieval over re-exposure, meaning before form, one focus per correction, specific
feedback and no undeserved praise, CEFR-appropriate language, recycling what the learner has met,
and — for pronunciation — explicit refusal to claim it can hear the learner.

Anti-fabrication is a section of its own: call the tool or say you do not know, never invent a
score, a completed lesson, an achievement, a teacher or a statistic, and never report a metric this
application does not have ("you have attempted this four times and got it right once", never "your
weakness score is 73%").

## Voice

Not implemented. The Live API was verified as capable (GA; WSS; `gemini-3.8-live`; 16 kHz PCM in,
24 kHz out; function calling; 15-minute audio sessions with `contextWindowCompression`;
`sessionResumption`; ephemeral tokens for client-to-server). The product owner chose on 2026-10-06
to ship the text coach first.

The architecture does not need to change to add it: a `LiveConversationService` port beside
`AiAgentService`, a `GeminiLiveProvider` in the shared `providers/gemini/` folder, and a WebSocket
route proxying browser ↔ Gemini so the key stays server-side. Verified cost is the reason it is a
deliberate decision: ≈ $0.023 per minute of conversation on the paid tier.

## Render deployment

The API serves the SPA from its own origin (ADR-028, model C), so the coach needs **no CORS, no new
service and no WebSocket support**: `/learn/coach` is an SPA route, `/ai-coach/*` is an API path on
the same host over HTTPS.

| Variable               | Values                           | Notes                                                                                                         |
| ---------------------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `AI_COACH_PROVIDER`    | `fake` \| `gemini` \| `disabled` | `fake` is the default everywhere and is **refused in production**. `gemini` is refused under `NODE_ENV=test`. |
| `AI_COACH_MODEL`       | default `gemini-3.8-flash`       | Read only by the coach's composition root.                                                                    |
| `GEMINI_AGENT_API_KEY` | secret, optional                 | The coach's own key. Falls back to `GEMINI_API_KEY`.                                                          |
| `GEMINI_API_KEY`       | secret, existing                 | Shared with the offline TTS pipeline.                                                                         |

To switch the coach on in the deployed environment: set `AI_COACH_PROVIDER=gemini` and a key in
Render's environment (secret, never committed), then redeploy. To switch it off:
`AI_COACH_PROVIDER=disabled` — the route answers a safe 503 and the page tells learners the rest of
the product works. Nothing else in the deployment changes.

**Use a separate `GEMINI_AGENT_API_KEY` if the media pipeline is still generating videos.** One
Gemini project has one daily quota; this project's key has been hitting roughly 100 requests a day
(M21/M22), and a coaching turn costs 1–5 requests. Learner traffic would otherwise compete with
video generation.

The coach is deliberately **not** in `/ready`: a Gemini outage must not take the platform out of
rotation.

## Observability

- Metrics (M18): `provider_calls_total` / `provider_call_duration_ms` with
  `operation="ai_coach"`, `provider`, `outcome` and a bounded category (`timeout`, `rate_limited`,
  `unavailable`, `rejected`, `configuration`, `bad_response`, `busy`, `disabled`). Both calls of a
  turn are measured, because that is what the quota is spent on.
- One log line per turn, `ai_coach.turn_completed`: mode, tool names, instruction version, token
  counts, whether an activity was produced, history length. **Never** the message, the answer, a
  tool argument, a tool result or the learner's id.
- Failures are logged by the existing error hook with a safe category.

## Cost

Verified pricing (2026-10-06): `gemini-3.8-flash` is "Free of charge" on the free tier; the paid
tier is **$0.75 / 1M input tokens and $3.75 / 1M output** (listed as held through 2026-12-31). The
free-tier rows are **not** an option for serving learners here: the Gemini terms require Paid
Services for users in the EEA/UK/Switzerland, and this project uses a paid project (ADR-013 M21
addendum).

A turn costs one request plus one per tool round. The five verification calls totalled ≈ 1,150
tokens. Controls: `thinking_level: "low"` (thought tokens are billed as output and were measured at
528 → 0), ≤4 tool rounds, ≤4 calls per round, capped tool output, a 12-turn history, a
1,000-character message, 20 turns/hour per learner, and ≤2 concurrent turns per process.

No monthly figure is given: it would need an expected-usage number this project does not have.

## Limitations

- The coach's language quality has not been reviewed by a native speaker at any level — the same
  open item as M22's videos.
- Per-tier rate limits are not published in the documentation (it points to AI Studio), so our
  limits are set against observed behaviour, not a documented number.
- The derived CEFR level is a heuristic: the highest level among recent lesson activity, else the
  language's first available level. A learner who has done nothing is treated as a beginner.
- `get_weak_areas` orders stored counts; it is not a model of what a learner finds hard, and the
  tool says so to the model.
- The conversation is lost on reload, and rate limits are per process (a scaled-out deployment
  would need a shared store — the same assumption as M12's audio cache).
- Voice is not implemented.
- Automated tests never call the real API, so answer _quality_ rests on the manual scenarios in
  [m23-ai-evaluation.md](m23-ai-evaluation.md) — run once, on 2026-10-06, with one seeded learner.
  A regression in answer quality would not fail CI; re-run the scenarios after any change to the
  instructions, the tool set or the model.
- The conversation mode's deferred corrective summary was not exercised over a long conversation
  (the one-turn check showed it correctly not correcting mid-flow, which is only half the rule).

## Future work

RAG over a future unstructured corpus (teacher materials, articles), real-time voice via the Live
API, pronunciation scoring if a verified speech capability supports it, persisted conversation
history (needs its own privacy decision), richer practice types, and an automated evaluation
harness. None of these is required by M23.
