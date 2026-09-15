# ADR-013: Audio Generation (Gemini)

Status: PROPOSED (architecture only; integration not implemented)
Date: 2026-09-15

## Context

Lessons need narration/pronunciation audio. Brief specifies "a Gemini API" without naming a
model, and explicitly forbids assuming model/API details before verification.

## Decision

Verified (2026-09-15, see [ai-integration-strategy.md](../architecture/ai-integration-strategy.md)):
Gemini API offers text-to-speech via Gemini 2.5 model variants, currently in **Preview** status,
text-in/audio-out only, single/multi-speaker, natural-language style control, 32k-token session
limit. Source: `ai.google.dev/gemini-api/docs/speech-generation`.

**Architecturally accepted**: `AudioGenerationService` interface, implemented by a
`GeminiAudioProvider` adapter.

**Not yet accepted (PENDING/UNKNOWN)**: exact pricing/rate limits, Polish-language pronunciation
quality, and whether Preview status is acceptable for MVP launch (a Preview API can change/break
without the same stability guarantees as GA). This must be re-verified at implementation time,
and a fallback plan (e.g., delaying audio-dependent lessons, or evaluating a GA alternative)
should be considered if Preview status still holds and is judged too risky then.

## Options considered

Only Gemini was specified. No alternative TTS provider (e.g., other cloud TTS APIs) was evaluated
in M0, since the brief names Gemini specifically; a substitution would need its own ADR.

## Consequences

- Preview-status dependency is tracked as a risk (see
  [risk-register.md](../risk-register.md)) — a breaking API change could require adapter rework.
- Audio generation must be decoupled enough (via the interface) that a provider swap is a
  `packages/data` change only.

## References

- [ai-integration-strategy.md](../architecture/ai-integration-strategy.md)
- [ai.google.dev/gemini-api/docs/speech-generation](https://ai.google.dev/gemini-api/docs/speech-generation)
