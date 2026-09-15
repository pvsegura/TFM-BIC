---
name: gemini-audio
description: Audio-generation integration via the Gemini API TTS (Preview) - what's verified, what's UNKNOWN, and the AudioGenerationService abstraction. Use before or while implementing audio generation.
---

# Gemini Audio (TTS)

Not implemented as of M0. Full context: [ADR-013](../../../docs/adr/adr-013-audio-generation.md),
[ai-integration-strategy.md](../../../docs/architecture/ai-integration-strategy.md).

## Verified (as of 2026-09-15, re-verify before implementing — status may have changed)

- Gemini API text-to-speech, **Preview status**, requires a Gemini 2.5 model variant with TTS
  capability. Text-only input, audio-only output. Single- or multi-speaker. Style/accent/pace/tone
  controllable via natural language. Session context window: 32k tokens.
  Docs: [ai.google.dev/gemini-api/docs/speech-generation](https://ai.google.dev/gemini-api/docs/speech-generation).

## UNKNOWN — verify before writing `GeminiAudioProvider`

Exact pricing/rate limits, Polish-language pronunciation quality, current Preview-vs-GA status
(may have changed since this was written), and any breaking API changes since 2026-09-15. Do not
assume a specific model name/version without checking the live docs first.

## Architecture

`GenerateLessonAudioUseCase -> AudioGenerationService (interface, packages/application) ->
GeminiAudioProvider (adapter, packages/data)`. The use case never imports the Gemini SDK directly.

## Preview-status risk

Because this is a Preview API, treat it as more likely to have breaking changes than a GA one.
Isolate any Gemini-specific request/response shape entirely inside the adapter so a provider swap
or a Gemini API version bump doesn't ripple into `packages/application`. Tracked in
[risk-register.md](../../../docs/risk-register.md) (#2).
