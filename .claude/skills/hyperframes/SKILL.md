---
name: hyperframes
description: Video-generation integration via Hyperframes (HeyGen's open-source HTML-to-video renderer) - what's verified, what's UNKNOWN, and the VideoGenerationService abstraction. Use before or while implementing video generation.
---

# Hyperframes

Not implemented as of M0. Full context: [ADR-012](../../../docs/adr/adr-012-video-generation.md),
[ai-integration-strategy.md](../../../docs/architecture/ai-integration-strategy.md).

## Verified (as of 2026-09-15, re-verify before implementing — this is an active OSS project)

- Open-source, Apache 2.0, self-hostable. Renders HTML/CSS/JS timelines (attributes like
  `data-start`, `data-duration`, `data-track-index`; CSS/GSAP/Lottie/Three.js animation) into
  deterministic MP4 via frame-by-frame capture. Free, no per-render fee.
  Docs: [hyperframes.heygen.com/introduction](https://hyperframes.heygen.com/introduction).
  Source: [github.com/heygen-com/hyperframes](https://github.com/heygen-com/hyperframes).
- Self-hosted rendering doesn't require AWS (AWS Lambda is one optional deploy target among
  others in the docs, not a requirement) — compatible with this project's no-AWS constraint.

## UNKNOWN — verify before writing `HyperframesProvider`

Exact CLI/API invocation, any authentication needed for local rendering, webhook support, output
storage conventions, rendering compute requirements at this project's expected hosting target.
Read the full docs at `hyperframes.heygen.com` (Quickstart, API Reference) before coding — do not
guess the CLI/API surface from this summary.

## Architecture

`GenerateLessonVideoUseCase -> VideoGenerationService (interface, packages/application) ->
HyperframesProvider (adapter, packages/data)`. The use case never imports Hyperframes directly.
Video scripts (HTML/timeline) are stored as content under `content/video-scripts/`.

## Cost/ops note

Frame-by-frame headless-browser rendering is CPU-bound — factor render time/compute into whatever
hosting choice [ADR-015](../../../docs/adr/adr-015-deployment.md) settles on. Tracked in
[risk-register.md](../../../docs/risk-register.md) (#1, #9, #11).
