---
name: hyperframes
description: Video rendering via Hyperframes (HeyGen's open-source HTML-to-video renderer) in the offline media pipeline - what's verified, what's UNKNOWN, and the EducationalVideoRenderer abstraction. Use before or while changing how lesson videos are rendered.
---

# Hyperframes

Used by the offline media pipeline (M21) to render every published lesson and word video. Full context:
[ADR-031](../../../docs/adr/adr-031-video-first-educational-media.md),
[ADR-032](../../../docs/adr/adr-032-pedagogical-video-system.md),
[ai-integration-strategy.md](../../../docs/architecture/ai-integration-strategy.md). M11's on-demand path
([ADR-012](../../../docs/adr/adr-012-video-generation.md)) was retired on 2026-10-21.

## Verified (re-verified 2026-09-24, M11 — re-verify again before further work: this is an active OSS project)

- Open-source, Apache 2.0, self-hostable. Renders HTML/CSS/JS timelines (attributes like
  `data-start`, `data-duration`, `data-track-index`; CSS/GSAP/Lottie/Three.js animation) into
  deterministic MP4 via frame-by-frame capture. Free, no per-render fee, no HeyGen credits used.
  Docs: [hyperframes.heygen.com/introduction](https://hyperframes.heygen.com/introduction),
  [hyperframes.heygen.com/quickstart](https://hyperframes.heygen.com/quickstart).
  Source: [github.com/heygen-com/hyperframes](https://github.com/heygen-com/hyperframes).
- Self-hosted rendering doesn't require AWS (AWS Lambda is one optional deploy target among
  others in the docs, not a requirement) — compatible with this project's no-AWS constraint.
- **CLI, verified**: `npx hyperframes init|preview|render --output <file>|lint|check|snapshot|
publish|doctor` for local use. `npx hyperframes cloud render` is the HeyGen-hosted path (needs
  auth) — not used here. `npx hyperframes lambda ...` is AWS Lambda distributed rendering — not
  used here.
- **Authentication, verified**: none required for local/self-hosted rendering.
- **Requirements, verified**: Node 22+, FFmpeg, headless Chrome on the host.
- **Programmatic API**: `@hyperframes/producer` npm package exists ("Render a HyperFrames project
  from Node.js") but its exact function signature is UNKNOWN — not used; `HyperframesCliProvider`
  shells out to the CLI instead.
- **Usage model**: designed for an AI coding agent to author the HTML/timeline project
  interactively (its own `/hyperframes` skill command); this platform automates _rendering_ an
  already-authored project, not _authoring_ one at runtime.

## Still UNKNOWN

Webhook support (if any) for the self-hosted path, exact render flags beyond `--output`
(resolution/fps/duration), `@hyperframes/producer`'s exact API. None of these blocked M11's
minimal adapter.

## Architecture (M21, current)

`GenerateContentMediaUseCase -> EducationalVideoRenderer (port, packages/application) ->`
`HyperframesVideoRenderer (packages/data/src/media) -> HyperframesCli (media/hyperframes-cli.ts) -> hyperframes render`

- Runs only as an operator command: `pnpm --filter @tfm-bic/data media` (`media-pipeline.cli.ts`). No HTTP
  request can start a render.
- The renderer writes a self-contained render project under the git-ignored `.media-build/` (composition from
  `media/scene/`, font, GSAP, narration clips) and runs the pinned package's `bin/hyperframes.mjs` through
  `execFile` — never `npx` on Windows, never a shell.
- Output (MP4, poster, captions) goes to `content/media/` with content-hashed names and is served by the API as
  published media.

## Status: verified in practice

The pipeline has rendered every published video in `content/media/` on the operator's machine (Node, FFmpeg and
headless Chrome present). Production never renders: the API only serves what was published. Before changing
render flags or upgrading `hyperframes`, re-check this skill's "Verified" section against the live docs (active
OSS project) and re-render one lesson to compare.

## Cost/ops note

Frame-by-frame headless-browser rendering is CPU-bound — factor render time/compute into whatever
hosting choice [ADR-015](../../../docs/adr/adr-015-deployment.md) settles on. Tracked in
[risk-register.md](../../../docs/risk-register.md) (#1, #9, #11).
