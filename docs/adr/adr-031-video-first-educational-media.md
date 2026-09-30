# ADR-031: Video-first educational media — offline, content-driven generation; committed, same-origin delivery

Status: ACCEPTED (M21) / PENDING: legal review of Gemini's under-18 clause (from ADR-013); narrator names
confirmed by listening; push/deploy
Date: 2026-09-30

## Context

After M20A the product had lessons, vocabulary and phonetics as text, but not one playable video or stored
audio clip ([docs/m21-audit.md](../m21-audit.md)). M11 (ADR-012) built a Hyperframes adapter and a runtime job
API that a learner could trigger; M12 (ADR-013) built runtime Gemini TTS behind a "Listen" button. Neither had
ever run against the real provider, both were `disabled` on the deployed demo, and neither had media storage.
M21 makes explainer videos the centre of lessons and words.

Constraints: zero-cost hosting (Render Free: ephemeral disk, 512 MB; ADR-028), no AWS, strict same-origin CSP,
the domain free of provider SDKs (ADR-011), no invented linguistic content, no generation on page visits, a
consistent narrator per lesson, and the brief's requirement to verify providers before use.

Provider facts verified on 2026-09-30 (sources in [docs/m21-video-architecture.md](../m21-video-architecture.md)):
Hyperframes 0.8.x renders an HTML composition (sized root with `data-composition-id`, timed `.clip`
elements, `<audio>` clips mixed by FFmpeg, one paused GSAP timeline registered on `window.__timelines`) to MP4
locally with Node ≥ 22, Chrome and FFmpeg, no account; it sends anonymous telemetry unless
`HYPERFRAMES_NO_TELEMETRY=1`/`DO_NOT_TRACK=1`. Gemini `gemini-3.8-flash-tts` (GA) returns one WAV per request,
has 30 documented prebuilt voices and no language parameter; paid output is $9.00 per 1M audio tokens at 25
tokens per second of audio (until 2026-12-31).

## Decision

1. **Generation is an offline operator step**, never a request handler: `pnpm --filter @tfm-bic/data media
<doctor|plan|audition|generate>`. Visiting a page cannot cause a provider call.
2. **Content-driven scripts.** A `VideoScript` (domain: scenes of a few layouts plus the lines spoken in each) is
   built by the application layer from the lesson or vocabulary item. All language is verbatim content; the
   only added words are fixed framing sentences ("It means…", "Now it's your turn…"). A word's example is its
   own, or a lesson sentence containing it verbatim (labelled with the lesson); otherwise there is none.
3. **Timing from real audio.** Every spoken line is its own clip; scene lengths come from measured clip
   durations, and the same timeline yields the WebVTT captions. Explanations and meanings are narrated in the
   instruction language; each target-language phrase is a separate clip (the TTS detects language per request).
4. **Narrators by configuration.** `content/languages/<lang>/media/narrators.json` maps a narrator character
   to a Gemini prebuilt voice and a fixed style; `plan.json` assigns one narrator per lesson and per vocabulary
   category. Same-lesson consistency = same voice, model and style on every clip. This is **configuration
   consistency, not a guaranteed identity** — the provider does not promise identical-sounding generations,
   and Gemini's custom/replicated voices (stateful, 1-year TTL) were not adopted.
5. **Reuse and idempotency.** A clip's identity is a hash of (narrator configuration, language, text): an
   identical line is generated once and reused by every video and page — a word's page plays the same clip its
   video speaks. A video's _source hash_ covers script, narrator configuration and renderer/template version;
   an up-to-date target is skipped without any provider call; `--force` is the only way to regenerate.
6. **Hyperframes renders a generated composition** (template in `packages/data`, GSAP only inside the render
   project — not in the web bundle). CSS keyframes are not used because the documented deterministic contract
   is the registered GSAP timeline. Telemetry is disabled for every run.
7. **Storage: committed files, same origin.** Published MP4/JPG/VTT/M4A files and `content/media/manifest.json`
   are committed with the content and shipped in the image (which already copies `content/`). File names carry
   a content hash, so URLs are immutable and cached for a year. The API serves `/media/files/*` **only for paths
   listed in the manifest** (no filesystem path from a URL), with single byte ranges for seeking.
8. **Read API**: `GET /media`, `/media/lessons/:id`, `/media/vocabulary/:id` — public like the catalog, published
   content only, allowlisting response schemas (no provider, model, hashes or errors).
9. **Cost controls**: explicit command, dry `plan` with the number of provider calls, `--draft` (silence, no
   provider), per-run `--limit` (≤ 40) and `--max-calls` (≤ 400), bounded adapter retries (ADR-013), failures
   recorded per target without unpublishing a previous asset.
10. **UX**: video first on lessons, explanations and words; stored pronunciation clips ("slow" is the playback
    rate); "Video coming soon" where nothing is published; `/learn/videos` is a library; M11's learner-triggered
    render demo moves, unlinked, to `/learn/videos/render-demo`.

## Alternatives considered

- **Runtime generation on demand (M11/M12 style)** — rejected for content: cost per visit, a paid provider
  reachable from user traffic, and no storage on the host. The runtime paths remain for their own APIs.
- **External object storage** (e.g. an S3-compatible free tier) — a new provider, account and credentials for
  ~50 MB; rejected by the user for now. The manifest's relative paths keep this a later adapter change.
- **Git LFS** — GitHub's free quota and whether Render fetches LFS objects are unverified.
- **GSAP in the web app / in-browser motion instead of MP4** — would add a runtime dependency and need the
  narration anyway; an MP4 is portable, cacheable and works with native controls and captions.
- **One clip per whole video** — simpler, but timing would have to be guessed and the target-language phrases
  would be read inside English sentences.

## Consequences

- The repository grows with media (estimate for the whole Polish A1 set: tens of MB); a large catalogue will
  need object storage behind the same manifest.
- Rendering needs Node 22+, Chrome and FFmpeg on the operator's machine only. On this 8 GB laptop Hyperframes
  used its low-memory mode: a 2-minute lesson took ~17 min, a 30 s word ~1 min.
- Gemini remains _unused at runtime_ (`AUDIO_GENERATION_PROVIDER` can stay `disabled` in the demo); the key is
  needed only where the pipeline runs, read from the environment or the git-ignored `.env.media.local`.
- The under-18 clause of the Gemini terms (ADR-013) still applies to generating content for a service minors
  may use — **PENDING legal review**; the user chose a paid Gemini project, which addresses the EEA paid-tier
  requirement.
- Narrator names are character labels chosen before anyone listened to the voices; they must be confirmed by
  the audition before scaling.

## References

[ADR-011](adr-011-ai-architecture.md), [ADR-012](adr-012-video-generation.md),
[ADR-013](adr-013-audio-generation.md), [ADR-028](adr-028-production-runtime-and-deployment.md),
[docs/m21-video-architecture.md](../m21-video-architecture.md),
[docs/m21-content-generation.md](../m21-content-generation.md).
