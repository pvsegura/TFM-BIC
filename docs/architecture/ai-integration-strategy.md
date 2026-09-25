# AI / External Media Service Integration Strategy

Status: IMPLEMENTED (video M11, audio M12 — real providers unverified end-to-end) | Related: [ADR-011](../adr/adr-011-ai-architecture.md), [ADR-012](../adr/adr-012-video-generation.md), [ADR-013](../adr/adr-013-audio-generation.md)

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

## Video: Hyperframes — verified facts (re-verified 2026-09-24, M11)

- Hyperframes is an **open-source (Apache 2.0), self-hostable** framework: it renders HTML/CSS/
  JS timelines (driven by `data-start`/`data-duration`/`data-track-index` attributes, with
  CSS/GSAP/Lottie/Three.js animation) into deterministic MP4 via frame-by-frame capture, not
  playback recording.
  Source: [hyperframes.heygen.com/introduction](https://hyperframes.heygen.com/introduction),
  [GitHub: heygen-com/hyperframes](https://github.com/heygen-com/hyperframes).
- It is free to self-host, no per-render fees, no commercial-use threshold under Apache 2.0.
- Local/self-hosted rendering does not depend on AWS; AWS Lambda is one _optional_ deployment
  target mentioned in the docs among others — not a requirement. This satisfies the "no AWS"
  constraint.
- **CLI surface, verified**: `npx hyperframes init`, `preview`, `render --output <file>`, `lint`,
  `check`, `snapshot`, `publish`, `doctor` for local use; `npx hyperframes cloud render` for
  HeyGen-hosted rendering; `npx hyperframes lambda ...` for AWS Lambda distributed rendering
  (unused here). Source: `hyperframes.heygen.com/quickstart`,
  `github.com/heygen-com/hyperframes` README.
- **Authentication, verified**: **no authentication or credential is required for local/
  self-hosted rendering**, and it uses no HeyGen credits. Only the HeyGen-hosted `cloud render`
  path requires signing in — not used by this project.
- **Requirements, verified**: Node 22+, FFmpeg, and headless Chrome on the rendering host.
- **Programmatic API**: `@hyperframes/producer` ("Render a HyperFrames project from Node.js")
  exists as an npm package, but its exact function signature/return shape is **UNKNOWN** — not
  read in this re-verification pass. M11's `HyperframesCliProvider` uses the CLI surface instead,
  which is fully verified.
- **UNKNOWN still**: webhook support (if any) for the self-hosted path, exact output
  resolution/fps/duration CLI flags beyond `--output`, and `@hyperframes/producer`'s API. None of
  these blocked M11's minimal adapter, which only needs `--output`.
- **Usage model, newly understood in M11**: Hyperframes is designed to be used interactively by an
  AI coding agent at content-authoring time (its own `/hyperframes` skill command generates the
  HTML/timeline project); the platform automates _rendering_ an already-authored project, not
  _authoring_ one from a runtime prompt. `content/video-scripts/<id>/` holds one hand-authored
  example project for M11's vertical slice.
- **Implementation status (M11)**: `VideoGenerationService` (port), `FakeVideoGenerationService`
  (the default dev/test/CI adapter, packages/data) and `HyperframesCliProvider` (real, shells out
  to `npx hyperframes render --output <file>`, packages/data) are implemented. The real adapter is
  **not executed end-to-end** in the M11 implementation environment (FFmpeg/headless Chrome
  availability unconfirmed; ADR-015 hosting still PENDING) — see ADR-012 and
  `content/video-scripts/README.md`.

## Audio: Gemini API TTS — re-verified facts (2026-09-25, M12)

**The 2026-09-15 facts below are superseded.** Re-verified against the official docs before any
adapter code was written — full list, sources and what remains unverified in
[ADR-013](../adr/adr-013-audio-generation.md):

- TTS is now **GA**: `gemini-3.8-flash-tts` (selected, >130 languages incl. Polish) and
  `gemini-3.8-flash-lite-tts`; preview models still listed.
- Called through the GA Interactions API (`POST /v1beta/interactions`, `x-goog-api-key`); the
  unary response carries the whole clip inline as base64 `audio/wav` (24 kHz mono 16-bit PCM).
- Input language is auto-detected; delivery is steered by a natural-language `style` annotation;
  30 prebuilt voices.
- Terms: no services likely to be used by under-18s; EEA/UK/CH deployments must use the paid
  tier — both **PENDING** product/legal decisions (ADR-013).

Implemented in M12 as:

```
GenerateVocabularyAudioUseCase -> GenerateAudioUseCase -> AudioGenerationService (interface)
    -> FakeAudioGenerationService (default: dev/test/CI) | GeminiAudioProvider (AUDIO_GENERATION_PROVIDER=gemini)
```

`GeminiAudioProvider` is unit-tested against the documented shapes but has **not** been run
against the real API. Nothing is stored: the clip goes straight back in the HTTP response.

### Superseded (M0, 2026-09-15)

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

## Update — M11 (video, 2026-09-24)

Video generation moved from PROPOSED to implemented (see ADR-012): `VideoGenerationService`,
`FakeVideoGenerationService` and `HyperframesCliProvider` exist in code. Audio generation (Gemini,
ADR-013) remains exactly as M0 left it — untouched by M11, still PROPOSED, no SDK installed, no
API key configured, no adapter code written. The two are independent milestones; nothing about
M11 implies M-audio is ready to start from different assumptions than this document already
states.

## Update — M12 (audio, 2026-09-25)

Audio generation moved from PROPOSED to implemented (see ADR-013 and the re-verified section
above). The two capabilities stay independent: nothing in video code knows about audio, and vice
versa. The intended future flow — content → audio clip → video narration — needs durable media
storage (PENDING), because a video render needs a stable file, whereas M12 returns each clip
directly in the HTTP response and keeps nothing.
