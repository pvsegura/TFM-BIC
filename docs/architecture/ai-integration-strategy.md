# AI / External Media Service Integration Strategy

Status: PROPOSED (M0 — no integration implemented) | Related: [ADR-011](../adr/adr-011-ai-architecture.md), [ADR-012](../adr/adr-012-video-generation.md), [ADR-013](../adr/adr-013-audio-generation.md)

## Principle

The domain and application layers must never import a Gemini or Hyperframes SDK/client directly.
All access goes through an interface owned by `packages/application` (or `packages/contracts`),
implemented by an adapter in `packages/data`:

```
GenerateLessonAudioUseCase -> AudioGenerationService (interface) -> GeminiAudioProvider (adapter)
GenerateLessonVideoUseCase -> VideoGenerationService (interface) -> HyperframesProvider (adapter)
```

This means: swapping Gemini for another TTS provider, or Hyperframes for another renderer, only
requires a new adapter — no change to use cases or domain.

## Video: Hyperframes — verified facts (2026-09-15)

- Hyperframes is an **open-source (Apache 2.0), self-hostable** framework: it renders HTML/CSS/
  JS timelines (driven by `data-start`/`data-duration`/`data-track-index` attributes, with
  CSS/GSAP/Lottie/Three.js animation) into deterministic MP4 via frame-by-frame capture, not
  playback recording.
  Source: [hyperframes.heygen.com/introduction](https://hyperframes.heygen.com/introduction),
  [GitHub: heygen-com/hyperframes](https://github.com/heygen-com/hyperframes).
- It is free to self-host, no per-render fees, no commercial-use threshold under Apache 2.0.
  Source: search aggregation citing the HyperFrames docs/license (see ADR-012 for full citation
  list).
- Local/self-hosted rendering does not depend on AWS; AWS Lambda is one _optional_ deployment
  target mentioned in the docs among others — not a requirement. This satisfies the "no AWS"
  constraint.
- **UNKNOWN**: exact CLI/API surface, authentication (if any is needed for local rendering),
  webhook support, output storage conventions, and any HeyGen-hosted-service quota/pricing (as
  opposed to self-hosted use) — full API reference exists at `hyperframes.heygen.com` but was not
  exhaustively read in M0. Must be re-verified against the live docs immediately before
  implementing `HyperframesProvider`.

## Audio: Gemini API TTS — verified facts (2026-09-15)

- Gemini text-to-speech is provided via the Gemini API, **Preview status**, requiring a
  Gemini 2.5 model variant with TTS capability. Text-only input, audio-only output, single- or
  multi-speaker, natural-language-controllable style/accent/pace/tone. Session context window:
  32k tokens.
  Source: [ai.google.dev/gemini-api/docs/speech-generation](https://ai.google.dev/gemini-api/docs/speech-generation).
- **UNKNOWN**: exact per-character/per-request pricing, rate limits, supported languages'
  pronunciation quality for Polish specifically, and whether Preview status implies breaking
  changes are likely before GA. Must be re-verified immediately before implementing
  `GeminiAudioProvider`, and the Preview status should be re-checked (it may have reached GA by
  implementation time).

## Content produced by these services

Videos: audio, narration, animations, examples, drawings, explanations, text, subtitles/
transcript — all describable as an HTML/timeline script, stored under `content/video-scripts/`.

Audio: narration/pronunciation clips referenced from `content/languages/<id>/...` and from
`Media` domain records (see [domain-model.md](domain-model.md)).

## What is explicitly NOT done in M0

No SDK installed, no API key configured, no adapter code written, no prompt/script format
finalized. This document exists so ADR-012/013 can be written honestly (PROPOSED, not ACCEPTED)
and so implementation work in a later milestone starts from verified facts instead of assumptions.
