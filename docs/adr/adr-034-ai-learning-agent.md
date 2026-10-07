# ADR-034: AI Learning Coach (Gemini agent with application tools)

Status: ACCEPTED (architecture, tool boundary, fake provider, text coach) / `GeminiAgentProvider`
verified against the real API on 2026-10-06, and the 15-scenario evaluation run against it the same
day (24 requests, docs/m23-ai-evaluation.md) / runtime use **AUTHORISED by the product owner on
2026-10-06 as an accepted risk**, with the under-18 terms question still unresolved (see "Provider
terms") / voice (Live API) **NOT IMPLEMENTED** (deferred by the product owner, 2026-10-06 — not a
technical blocker)
Date: 2026-10-06

## Context

M23 adds the platform's first AI feature that a learner interacts with directly: an AI Learning
Coach that can explain a mistake, recommend what to study next, practise vocabulary, help inside a
lesson, a video or a vocabulary entry, and hold a short conversation in the target language.

Gemini was already integrated (M12/M21/M22) but **only for text-to-speech, and only offline**: an
operator CLI generates lesson and word audio ahead of time, and
`AUDIO_GENERATION_PROVIDER` is `fake`/`disabled` in every deployed environment (ADR-013). So M23 is
the first time a Gemini call can happen **in response to a learner's request, in production**. That
changes which provider-terms clauses apply, not just the code (see "Provider terms").

### Verified facts (2026-10-06)

Sources: [interactions](https://ai.google.dev/gemini-api/docs/interactions),
[function-calling](https://ai.google.dev/gemini-api/docs/function-calling),
[structured-output](https://ai.google.dev/gemini-api/docs/structured-output),
[models](https://ai.google.dev/gemini-api/docs/models),
[pricing](https://ai.google.dev/gemini-api/docs/pricing),
[live](https://ai.google.dev/gemini-api/docs/live),
[live-session](https://ai.google.dev/gemini-api/docs/live-session),
[ephemeral-tokens](https://ai.google.dev/gemini-api/docs/ephemeral-tokens),
[terms](https://ai.google.dev/gemini-api/terms).

Documented, and **confirmed by four real calls** against
`POST https://generativelanguage.googleapis.com/v1beta/interactions` with this project's key
(throwaway script, never committed, not a test):

- **API**: the Interactions API, GA since June 2026 and "recommended for all new projects". Same
  endpoint and `x-goog-api-key` header M12 already uses for TTS.
- **Model**: `gemini-3.8-flash` (GA; text/image/video/audio/documents in; function calling listed
  as a core capability). Confirmed working with tools.
- **Function calling**: tools are declared as
  `tools: [{type: "function", name, description, parameters: <JSON Schema>}]`. The model answers
  with `status: "requires_action"` and a step
  `{type: "function_call", id, signature, name, arguments}`. A result is returned as an input step
  `{type: "function_result", name, call_id, result: [{type: "text", text}]}`.
  - **Resolved a documentation contradiction**: the REST guide shows `call_id`, the API reference
    shows `id`. The real response carries the call's identity in **`id`**, and a follow-up request
    that sends it back as **`call_id`** is accepted (HTTP 200, `status: "completed"`). The adapter
    reads `id` and writes `call_id`.
  - `thought` steps carry an opaque `signature`. Replaying a turn statelessly requires echoing the
    model's own `function_call` step (signature included) before the `function_result`.
- **Conversation state**: `previous_interaction_id` gives server-side history, but only together
  with `store: true` — the response of a `store: false` call carries **no interaction id at all**
  (confirmed: `id` was absent). So `store: false` and `previous_interaction_id` are mutually
  exclusive.
- **Retention**: stored interactions are kept 55 days (paid tier) / 1 day (free tier);
  `store: false` opts out.
- **Structured output**: `response_format: {type: "text", mime_type: "application/json", schema}`.
  Confirmed: returned exactly the requested shape and parsed as JSON.
- **Cost control**: `generation_config.thinking_level: "low"` is accepted and cut thought tokens
  from 528 to 0 on an equivalent request — thought tokens are billed as output.
- **Tool choice**: `generation_config.tool_choice` (`auto` | `any` | `none` | `validated`).
- **Pricing**: `gemini-3.8-flash` — free tier "Free of charge"; paid tier **$0.75 / 1M input
  tokens, $3.75 / 1M output** (listed as held through 2026-12-31). The four verification calls
  cost ≈ 1,150 tokens in total.
- **Rate limits**: the docs no longer publish per-model numbers — they point to AI Studio
  ("Rate limits depend on a variety of factors (such as your usage tier)"). **UNKNOWN** for this
  project's tier from documentation alone. Operationally, this project's key has been hitting a
  daily cap of roughly 100 requests (M21/M22 media generation), which is the number our own limits
  are set against.
- **Live API** (voice): GA. Stateful WebSocket (WSS); server-to-server is the documented
  recommendation for production, client-to-server needs ephemeral tokens
  (`uses`, `expire_time`, `new_session_expire_time`, `live_connect_constraints`; Live API only).
  Models `gemini-3.8-live` and `gemini-3.8-live-extended-thinking` (GA, audio-to-audio). Audio in:
  raw 16-bit PCM, 16 kHz, little-endian; out: the same at 24 kHz. Function calling supported.
  Audio-only sessions are limited to 15 minutes (connections to ~10 min) unless
  `contextWindowCompression` is enabled; `sessionResumption` handles reconnection and its tokens
  last 2 h. Free tier "Free of charge"; paid **$3.00 / 1M audio-input tokens (≈ $0.005/min)** and
  **$12.00 / 1M audio-output tokens (≈ $0.018/min)**.
- **Not verified**: per-tier rate limits (above); how good the coach's Polish actually is at each
  CEFR level (a native-speaker review item, like M22's); Live API behaviour (no Live call was made).

## Decision

1. **A second capability behind its own port, not a second Gemini integration.** M12's
   `AudioGenerationService` (TTS) is untouched. M23 adds
   `AiAgentService.respond(request) → AgentResponse` in `packages/application`, implemented by
   `GeminiAgentProvider` in `packages/data` — the only new file that knows Gemini exists. Both
   adapters now share the one endpoint constant and error translation
   (`packages/data/src/providers/gemini/`), so TTS keeps its behaviour and a third capability
   (Live) can be added beside them without touching either. The agent port speaks only in
   `AgentTurn`s, `AgentToolDeclaration`s and `AgentToolResult`s: no Gemini type, model name, step
   kind or `signature` crosses into `application` or `domain`.
2. **The application is authoritative; Gemini only reasons.** Gemini never reads the database. It
   asks for data by calling one of a fixed set of **tools**, each of which is a thin wrapper over an
   existing M4–M22 use case or a new read-model query. `AskCoachUseCase` runs the loop: send the
   turn → receive tool calls → validate → execute → return minimised results → repeat, at most
   `MAX_TOOL_ROUNDS` (4) with at most 4 calls per round.
3. **Every tool derives the learner from the session, never from the model.** A tool handler's
   signature takes the `userId` resolved by `authenticate` and a _parsed_ argument object; the tool
   schemas contain no `userId`, `studentId` or `email` field at all, so there is nothing for the
   model (or a learner's prompt) to put there. Arguments are parsed with Zod before a handler runs;
   anything else is a refused tool call reported back to the model as an error result, not an
   exception. Unknown tool names are refused the same way.
4. **Read tools, plus generation. No mutating tools in M23.** The registry is read-only except for
   practice _generation_, which writes nothing: a generated activity is returned to the browser as
   validated structured data and is never recorded as an exercise attempt, a point transaction or a
   progress row. The authoritative M7 flow stays the only way to answer an exercise. No tool can
   change an account, a role, a link, a subscription or a score, because no such tool exists.
5. **`store: false`, and the conversation lives in the browser.** Gemini is asked not to retain
   anything, which (verified) rules out `previous_interaction_id`; so each request replays a bounded
   history that the client sends back. The server accepts **only** `user` and `assistant` text turns
   from the client — never tool steps, never signatures — so a crafted history cannot forge tool
   output or impersonate the application. History is capped (12 turns, 2,000 characters per turn).
   **No new database table**: no `ai_conversations`, no `ai_messages`. Closing the tab ends the
   conversation, which is also the cheapest answer to retention, export and deletion (nothing to
   delete).
6. **A versioned instruction module, in the backend.** `AI_COACH_INSTRUCTIONS_V1`
   (`packages/application/src/coach/instructions/`) holds the role, the pedagogy (M22), the CEFR
   adaptation rules, the tool-usage and anti-fabrication rules and the refusals. The learner's
   message is always passed as learner input, never concatenated into the instruction. Changing
   behaviour means a new version constant, not an edit to a React component.
7. **Provider selection like every other provider.** `AI_COACH_PROVIDER` is `fake` (default,
   everywhere — a deterministic committed adapter that calls nothing), `gemini` (needs
   `GEMINI_API_KEY`; **refused under `NODE_ENV=test`**, so no test, CI or Playwright run can reach
   the paid API) or `disabled` (the route answers 503 and the UI says the coach is unavailable).
   `AI_COACH_MODEL` defaults to the verified `gemini-3.8-flash`. Production accepts `gemini` or
   `disabled`, never `fake`.
8. **An optional separate key.** `GEMINI_AGENT_API_KEY` is used when set, falling back to
   `GEMINI_API_KEY`. The coach and the offline media pipeline otherwise share one project's daily
   quota, and learner traffic would compete with video generation (M21/M22 need ~13 calls per
   video). One variable keeps them apart without a second integration.
9. **Cost and abuse control, in-process only** (no Redis, no queue). Revised 2026-10-07 after a
   provider capacity incident: the deadline is a **budget for the whole turn**
   (`AI_COACH_TURN_TIMEOUT_MS`, default 120 s), not a per-call timeout — a turn makes one call plus
   one per tool round, so a per-call limit bounds an HTTP request rather than the learner's wait.
   Each call is given what is left and none is attempted below 5 s remaining. The product owner chose
   to wait rather than pay. `AI_COACH_MODEL` is the escape hatch when the default model is saturated
   (`gemini-3.5-flash-lite` verified working at 905 ms during the incident). Also: a per-user limit
   (`perUserRateLimit`, 20 messages/hour) _and_ a per-address route limit (30/hour), a 1,000-character
   message limit, the history cap above, `MAX_TOOL_ROUNDS`, bounded tool output (every tool caps
   its own list length and text), `thinking_level: "low"`, a 25 s timeout, at most 2 retries for
   429/500/503/504, and at most 2 concurrent provider calls per process (beyond → 503).
10. **Graceful degradation.** A provider failure, a timeout, a rate limit or a malformed model
    response becomes a safe message ("The AI Coach is temporarily unavailable…") and never an
    exception that reaches the learner or a stack trace in a response. Nothing else in the product
    depends on the coach, and the coach is not in `/ready`: a Gemini outage must not take the
    platform out of rotation (the same rule ADR-028 applies to email and TTS).
11. **Voice is deferred, with the boundary already in place.** The Live API is verified as capable
    (above) and is **not** blocked technically. The product owner chose on 2026-10-06 to ship the
    text coach first. Nothing in this ADR's architecture has to change to add it: a
    `LiveConversationService` port beside `AiAgentService`, a `GeminiLiveProvider` in the shared
    `providers/gemini/` folder, and a WebSocket route proxying browser ↔ Gemini so the key stays
    server-side. Recorded as NOT IMPLEMENTED, with the verified cost (≈ $0.023/min of conversation
    on the paid tier) as the reason it is a deliberate product decision rather than a default.

## Provider terms (PENDING — unchanged by this ADR, but newly relevant)

ADR-013 recorded two open questions; M23 makes the first one _operational_ rather than theoretical,
because a learner's own request now triggers the call:

- **Under-18.** "You must be 18 years of age or older to use the APIs. You also will not use the
  Services as part of a website, application, or other service … directed towards or is likely to be
  accessed by individuals under the age of 18." A language-learning platform may well be accessed by
  minors. The legal question is **still unresolved** (also ADR-031/032).

  **Product owner decision, 2026-10-06: proceed anyway.** The owner was shown the clause and the
  fact that M23 is the first Gemini flow a _learner_ triggers (until now TTS ran offline as an
  operator batch job, so the clause applied to a batch of catalog text rather than to live user
  traffic), and authorised M23 to be built, enabled and run on that basis. This ADR records an
  **accepted risk**, not a resolved question and not a compliance finding: the clause still reads
  the same way, no legal review has happened, and nothing here is legal advice.

  The engineering consequence is unchanged — `AI_COACH_PROVIDER` ships as `fake`, production refuses
  `fake`, and `gemini` must be chosen deliberately per environment — so the decision stays visible
  and reversible with one variable.

- **EEA/UK/Switzerland.** "You may use only Paid Services when making API Clients available to users
  in the European Economic Area, Switzerland, or the United Kingdom." The project uses a paid Gemini
  project (M21 addendum), which addresses this clause. On the paid tier Google states it does not use
  prompts or responses to improve its products and logs them for a limited period for abuse
  prevention only. The free tier's "Free of charge" rows are therefore **not** an option for serving
  learners here, and no cost claim in this repository may rely on them.

Not legal advice; no compliance claim is made (anti-hallucination policy, ADR-026).

## What is sent to Gemini, and what is not

Sent: the versioned instruction text; the learner's typed message; the bounded transcript of the
current conversation; a small, named context (target language, CEFR level, interface locale, and the
id/title of the lesson, vocabulary entry, exercise or video the learner opened the coach from); the
tool declarations; and the minimised result of each tool the model calls. `store: false` on every
request.

Never sent: user id, email, name, nickname, avatar, role, password or hash, session cookie or token,
IP address, teacher or classmate data, another learner's anything, an exercise answer key beyond the
safe explanation context the backend chooses, `point_transactions`, newsletter state, or any
environment variable. The API key travels only in the `x-goog-api-key` header and is never logged,
returned or persisted. See [docs/privacy/EXTERNAL-DATA-FLOWS.md](../privacy/EXTERNAL-DATA-FLOWS.md).

## Options considered

- **Tool/function calling against our own services (chosen).** Pros: the application stays the
  source of truth; authorization is ours; answers are grounded in real learner data; no new data
  store. Cons: a round trip per tool round (latency), and the model can still phrase a grounded fact
  badly.
- **RAG over the content corpus.** Rejected for M23 (and by the brief): the educational content is
  already structured and addressable by id, so retrieval would add a vector store, embeddings and a
  sync problem to answer questions a typed tool answers exactly. Revisit when there is a large
  unstructured corpus (teacher materials, articles, long transcripts).
- **Server-side conversation state via `previous_interaction_id`.** Rejected: it requires
  `store: true`, i.e. 55-day retention of learner conversations at the provider, for a feature a
  12-turn client-side transcript already provides. It would also add provider state to the deletion
  matrix with no way to verify erasure.
- **Persisting conversations in PostgreSQL.** Rejected for M23 (decision 5). It is the natural next
  step _if_ the product wants visible history, and it would need its own privacy decision, register
  entry, export field and retention rule.
- **One Gemini SDK (`@google/genai`) instead of REST.** Rejected, consistent with ADR-013: the
  verified request shapes are small, `fetch` keeps timeout/retry explicit, and adding the SDK now
  would introduce a second way of talking to the same endpoint. Revisit for the Live API, where the
  SDK carries real WebSocket machinery.
- **Multiple agents (planner/evaluator/tutor).** Rejected (and excluded by the brief): one coach
  with modes is simpler to reason about, cheaper, and enough for these use cases.
- **Letting the browser talk to Gemini directly.** Rejected for the text coach: it would put a key
  (or an ephemeral token) in the client and move tool execution out of the backend. Only the Live
  API's documented client-to-server mode would justify ephemeral tokens, and voice is deferred.

## Consequences

- A provider swap is a new `AiAgentService` adapter plus one line in `coach-dependencies.ts`; the
  tools, instructions, use case, routes and UI do not change.
- Adding a tool is a declaration + a Zod schema + a handler in the registry, and an entry in the
  tool table in [docs/m23-ai-agent.md](../m23-ai-agent.md). Forgetting the authorization argument is
  impossible by construction: the handler cannot see a user id it was not given.
- The coach's quality is not covered by the automated suite (no real API in tests, by decision 7).
  [docs/m23-ai-evaluation.md](../m23-ai-evaluation.md) defines the manual scenarios instead, and
  records which were actually run and what happened.
- Two new metrics series (`ai_coach_*`) and one log event per turn, with no message content.
- The conversation is lost on reload. That is deliberate (decision 5) and visible in the UI, not a
  bug to fix by adding a table without a privacy decision.
- M23 is the second milestone the user has called M23 (the grammar reference, ADR-033, is labelled
  M23 in a route comment and in `router.tsx`). Left as written; this ADR is the AI Learning Coach.

## References

- [docs/m23-ai-agent.md](../m23-ai-agent.md), [docs/m23-ai-evaluation.md](../m23-ai-evaluation.md)
- [ADR-011](adr-011-ai-architecture.md) (interface-per-capability), [ADR-013](adr-013-audio-generation.md)
  (the Gemini TTS integration this reuses), [ADR-026](adr-026-privacy-data-management.md),
  [ADR-027](adr-027-security-hardening.md), [ADR-029](adr-029-observability.md),
  [ADR-032](adr-032-pedagogical-video-system.md) (the pedagogy the instructions follow)
- [docs/m22-pedagogical-framework.md](../m22-pedagogical-framework.md)
