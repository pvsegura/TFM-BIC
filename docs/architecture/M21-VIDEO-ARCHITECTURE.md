# M21 — Video architecture

Decision record: [ADR-031](adr/adr-031-video-first-educational-media.md). Audit: [m21-audit.md](m21-audit.md).

## Flow

```
content/languages/pl/levels/a1/content/*.json      content/languages/pl/vocabulary/*.json
                    │                                              │
                    └──────────► catalog repositories ◄────────────┘
                                         │
content/languages/pl/media/plan.json ────┤  (narrator per lesson/category, priority, pictograms)
                                         ▼
          application: buildLessonVideoScript / buildVocabularyVideoScript  →  VideoScript
                                         │
          GenerateContentMediaUseCase ── idempotency (source hash) · batch limit · call budget
                                         │
            NarrationSynthesizer ────────┤  StoredNarrationSynthesizer (data)
              one clip per line          │    GeminiAudioProvider (voice + style from narrators.json)
              reused by hash             │    → WAV → FFmpeg → AAC .m4a under content/media/<lang>/audio/
                                         ▼
          planVideoTimeline (real clip durations)  →  timeline + caption cues
                                         │
            EducationalVideoRenderer ────┤  HyperframesVideoRenderer (data)
                                         │    composition HTML (GSAP timeline) → HyperframesCliProvider
                                         │    → MP4 (faststart) + poster JPG + WebVTT
                                         ▼
          MediaManifestRepository  →  content/media/manifest.json (committed)
                                         │
          API: FileContentMediaCatalog (allowlist) → GET /media, /media/lessons/:id,
               /media/vocabulary/:id, /media/files/*  (ranges, immutable cache)
                                         │
          Web: EducationalVideo (native <video>, captions, transcript), PronunciationPlayer,
               MediaBadge, VideosPage, ContinueLearning, homepage Watch scene
```

## Layers

| Layer       | Files                                                                                                | Knows about providers?                                             |
| ----------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| domain      | `packages/domain/src/media/` — `VideoAsset`, `AudioAsset`, `ContentMedia`, `VideoScript`, `Narrator` | No                                                                 |
| application | `packages/application/src/media/` — script builders, timeline, use case, ports                       | No                                                                 |
| contracts   | `packages/contracts/src/media/media.schema.ts` — plan files, API responses                           | No (the plan schema names `gemini` as the only TTS provider value) |
| data        | `packages/data/src/media/` — synthesizer, composition, renderer, FFmpeg, manifest, catalog, CLI      | Yes — the only place                                               |
| api         | `apps/api/src/routes/media.route.ts`                                                                 | No                                                                 |
| web         | `apps/web/src/components/educational-video.tsx` etc.                                                 | No — only `VideoAsset`/`AudioAsset`                                |

Existing pieces reused, not duplicated: `AudioGenerationService` + `GeminiAudioProvider` (M12),
`HyperframesCliProvider` + `CliRunner` (M11), catalog repositories (M5/M9), `publicRateLimit`.

## States

Per target, reported by `generate` and recorded in the manifest's `lastRun`:
`requested → generating-audio → rendering → ready`, or `→ failed` (message kept, previous published asset kept),
or `skipped` (up to date / batch limit / call budget). No state is invented for the provider: Gemini answers
synchronously and local Hyperframes has no job API, so the pipeline's own steps are the states.

## Asset model (manifest entry)

`key` (`lesson:<id>` / `vocabulary-item:<id>`), `content`, `published` (`video`: purpose, file paths, poster,
captions, duration, size, narrator display name, transcript; `audio[]`: purpose, path, duration, text,
language), `sourceHash`, `narratorId`, `lastRun` (status, time, error, provider calls), `generator`
(`gemini:<model>` / `hyperframes@<version>/template-<n>`), `createdAt`, `updatedAt`. No secret, no key.
Only `published` reaches the browser, through the allowlisting schemas.

## Security

- Media is published catalog content; the endpoints are public (classified in the M16 route inventory).
- `/media/files/*` is an allowlist lookup; traversal and unlisted files (manifest, clip index) → 404 (verified).
- No remote media URL is ever fetched (no SSRF surface). Provider keys never reach the API process or browser.
- All content text in a composition is HTML-escaped; the render project loads only local files.

## Playback

Native `<video controls playsInline preload="metadata">` with poster and a default captions track; transcript
in a `<details>`; nothing autoplays (the homepage uses `preload="none"`); one video per page; library and cards
use lazy posters only. Failure states: request error → retry; file error → retry; no video → "Video coming soon".

## Verified provider facts (2026-09-30)

- Hyperframes: [html-schema](https://hyperframes.heygen.com/reference/html-schema.md),
  [compositions](https://hyperframes.heygen.com/concepts/compositions.md),
  [rendering](https://hyperframes.heygen.com/guides/rendering.md), [CLI](https://hyperframes.heygen.com/packages/cli.md)
  (`render --fps --quality --workers --quiet --output`, `doctor`, `telemetry disable`, `HYPERFRAMES_NO_TELEMETRY`),
  npm `hyperframes` (Apache-2.0, Node ≥ 22). Verified in practice: `doctor`, two draft renders and one full
  lesson render on this machine.
- Gemini: [speech-generation](https://ai.google.dev/gemini-api/docs/speech-generation) (models, Interactions
  request, 30 voices with descriptors, WAV 24 kHz), [pricing](https://ai.google.dev/gemini-api/docs/pricing),
  [rate limits](https://ai.google.dev/gemini-api/docs/rate-limits) (tier-specific, shown only in AI Studio).
- GSAP [standard licence](https://gsap.com/standard-license): no-charge, including commercial use; excludes
  tools competing with Webflow's visual animation builder (not this use).
