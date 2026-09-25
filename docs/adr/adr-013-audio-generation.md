# ADR-013: Audio Generation (Gemini)

Status: ACCEPTED (architecture, fake provider, API, vocabulary "Listen") / Gemini adapter
implemented against verified docs but **never executed against the real API** / production use
**PENDING** (provider terms, see "Privacy and provider terms")
Date: 2026-09-15 (M0, PROPOSED) — revised 2026-09-25 (M12)

## Context

Learners need to hear words and sentences. The brief names "a Gemini API" for audio and forbids
assuming model/API details before verification. M0 recorded Gemini 2.5 TTS in Preview; M12
re-verified everything against the current official documentation before writing code.

### Verified facts (2026-09-25)

Sources: [speech-generation](https://ai.google.dev/gemini-api/docs/speech-generation),
[gemini-3.8-flash-tts model page](https://ai.google.dev/gemini-api/docs/models/gemini-3.8-flash-tts),
[interactions](https://ai.google.dev/gemini-api/docs/interactions),
[api-errors](https://ai.google.dev/gemini-api/docs/api-errors),
[terms](https://ai.google.dev/gemini-api/terms).

- **Models**: GA — `gemini-3.8-flash-tts` (>130 languages), `gemini-3.8-flash-lite-tts`
  (>100 languages). Preview — `gemini-3.1-flash-tts-preview`, `gemini-2.5-pro-preview-tts`. The
  M0 "Preview only" finding is obsolete: TTS is now GA.
- `gemini-3.8-flash-tts`: text in, audio out; input limit 8,192 tokens, output 16,384.
- **API**: the Interactions API (GA since June 2026, "recommended for all new projects";
  `generateContent` still supported).
  `POST https://generativelanguage.googleapis.com/v1beta/interactions`, header `x-goog-api-key`.
  Body: `model`, `input: [{type: "user_input", content: [{type: "text", text, annotations:
[{type: "speech_metadata", style}]}]}]`, `response_format: {type: "audio"}`,
  `generation_config: {speech_config: [{voice}]}`.
- **Response**: unary → the whole clip inline, base64, in `steps[].content[]` (`type: "audio"`),
  or `output_audio.data` via the SDK. Default format **`audio/wav`, 24 kHz, mono, 16-bit signed
  little-endian PCM** (RIFF header). Streaming defaults to headerless `audio/l16`; `audio/mulaw`
  and `audio/alaw` are configurable. No provider URL, no hosted asset, no job to poll.
- **Language**: detected automatically from the text; there is no language parameter. Polish is
  listed as supported by both GA models.
- **Voices**: 30 documented prebuilt voices (e.g. `Kore`, `Puck`) plus a larger voice library;
  delivery is steered by the natural-language `style` annotation.
- **Errors**: `400 invalid_request`, `403 permission_denied`, `404 not_found`,
  `429 rate_limit_exceeded`, `500 api_error`, `503 service_unavailable`, `504 deadline_exceeded`.
  Documented as retryable: 429/500/503/504 (plus quota/too-many-requests variants), with
  exponential backoff. `payment_required` is not retryable.
- **Storage by Google**: Interactions are stored by default (`store=true`; paid tier 55 days, free
  tier 1 day); `store=false` opts out.
- **SDK**: `@google/genai` (Apache-2.0, 2.24.0, Node ≥ 20, deps `google-auth-library`,
  `protobufjs`, `ws`, `p-retry`).
- **Not verified / not found in the docs**: exact pricing and rate limits for this project's tier;
  the exact JSON placement of `store` (the docs say "set `store=false` in your request" without a
  REST example — we send it top-level, like the documented top-level `stream`); Polish
  pronunciation _quality_ (listed as supported, never listened to).

## Decision

1. **Provider-independent capability.** `AudioGenerationService.generate(request) → GeneratedAudio`
   (application port). One synchronous call: the verified API returns the whole clip in one
   response, so there is no job, status or cancel operation, and no job table (unlike M11's video
   jobs). The domain holds only `SpeechRequest` (validated `SpeechText`, `LanguageId`,
   `VoiceProfile`) and `AudioFormat` — no provider name, model or voice.
2. **Voice profiles, not voices.** `standard` | `slow`. The Gemini adapter maps both to one
   documented prebuilt voice (`Kore`); they differ only in a style instruction we write. The
   language hint in that style comes from the catalog locale via `Intl.DisplayNames` — nothing
   Polish-specific.
3. **Gemini as the first provider, via REST, not the SDK.** `GeminiAudioProvider` (packages/data)
   calls the documented endpoint with `fetch`. One request shape is all M12 needs; owning it keeps
   timeout/retry behaviour explicit (the SDK brings its own `p-retry`) and adds no dependency or
   transitive supply-chain surface. Revisit if more of the API is needed.
4. **Model** `gemini-3.8-flash-tts` (GA, widest language support), configurable via
   `GEMINI_TTS_MODEL`, read in exactly one place (the API composition root).
5. **The client never supplies the text.** `POST /audio-generations` takes a content reference —
   `{source: {type: "vocabulary-item", vocabularyItemId, part: "lemma"|"example"}, voice}` — and
   the server reads the text from the catalog after vocabulary's own visibility check. So no
   student-written text and no personal data ever reaches Gemini, and the endpoint cannot be used
   as a general TTS proxy. The educational text and our style instruction travel in separate
   fields. `source` is a discriminated union: future consumers (phonetic examples, lesson/video
   narration) add a member, not an endpoint.
6. **No storage.** The clip is returned in the HTTP response (`200 audio/wav`) and played from a
   Blob URL. Nothing is written to PostgreSQL or to an object store; no AWS. Durable media storage
   stays **PENDING** until a consumer needs a stable URL (e.g. video narration) and ADR-015
   (hosting) is decided.
7. **Cost controls, in-process only.** Per-route rate limit (30/hour), a configurable text limit
   (`AUDIO_GENERATION_MAX_TEXT_LENGTH`, default 300, domain ceiling 500), a bounded LRU cache of
   generated clips (200 entries / 32 MB) keyed by `(language, voice, normalised text)`, in-flight
   de-duplication of identical requests, and at most 4 concurrent provider calls (beyond → `503`).
   No Redis, queue or billing system. The cache is not shared between instances and is lost on
   restart — acceptable, since a miss only costs one generation.
8. **Retries** (adapter-owned): at most 2 retries for 429/500/503/504 and network errors,
   exponential backoff 500 ms → 1 s (capped at 8 s, `Retry-After` honoured within the cap). Never
   retried: our own 20 s timeout (the abandoned call may still be billed) and every other 4xx.
9. **Fake by default.** `AUDIO_GENERATION_PROVIDER=fake` (the default) returns a deterministic
   0.25 s WAV tone. `gemini` requires `GEMINI_API_KEY` and is **refused by `loadEnv` under
   `NODE_ENV=test`**, so no test, CI or Playwright run can call the paid API.

## Privacy and provider terms (PENDING — needs a product/legal decision before real use)

Sent to Gemini per request: the catalog text, the model name, the voice name, our style
instruction, and `store: false`. Never sent: user id, email, session, profile, or anything derived
from the student. The API key travels only in the `x-goog-api-key` header and is never logged.

The current Gemini API terms say (verified 2026-09-25):

- Users must be 18+, and the APIs must not be used in a service "directed towards or likely to be
  accessed by individuals under the age of 18". **A language-learning platform may well be
  accessed by minors.** Whether that rules out Gemini for this product is a legal/vendor question,
  not an engineering one — **PENDING**.
- In the EEA/UK/Switzerland only Paid Services may be used to serve users. Unpaid-tier content may
  be used to improve Google products and may be read by human reviewers; paid-tier content is not
  used for that and is logged for 30 days for abuse monitoring. A deployment therefore needs a
  **paid** Gemini project — **PENDING** (no account exists).

Until both are resolved, `AUDIO_GENERATION_PROVIDER` stays `fake` in every environment.

## Options considered

- **`@google/genai` SDK** — official and verified; not adopted for now (decision 3).
- **Asynchronous job + polling, like M11 video** — rejected: the provider is synchronous and clips
  are short; a job table would be persistence without a need.
- **Client-supplied text** — rejected: prompt-injection surface, cost abuse, and personal data
  could reach the provider.
- **Storing clips in PostgreSQL or object storage** — rejected (decision 6).
- No alternative TTS provider was evaluated: the brief names Gemini. A substitution is a new
  adapter plus its own ADR.

## Consequences

- A provider swap is a new `AudioGenerationService` adapter in `packages/data` and one line in
  `apps/api/src/composition/audio-dependencies.ts`.
- The Gemini adapter is unit-tested against the documented request/response/error shapes with an
  injected `fetch`; it has **not** been run against the real API. The first real run (with a paid
  key, after the terms decision) must confirm the `store` field placement, the response shape, and
  how Polish sounds — especially single words, where automatic language detection has the least
  to go on.
- The in-process cache and concurrency limit assume a single API instance (the same assumption as
  M11's in-process jobs).

## References

- [ai-integration-strategy.md](../architecture/ai-integration-strategy.md)
- [ADR-011](adr-011-ai-architecture.md), [ADR-012](adr-012-video-generation.md),
  [ADR-015](adr-015-deployment.md)
