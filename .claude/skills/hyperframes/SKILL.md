---
name: hyperframes
description: Video-generation integration via Hyperframes (HeyGen's open-source HTML-to-video renderer) - what's verified, what's UNKNOWN, and the VideoGenerationService abstraction. Use before or while implementing video generation.
---

# Hyperframes

Implemented as of M11 (architecture + fake provider; real adapter unverified). Full context:
[ADR-012](../../../docs/adr/adr-012-video-generation.md),
[ai-integration-strategy.md](../../../docs/architecture/ai-integration-strategy.md),
[content/video-scripts/README.md](../../../content/video-scripts/README.md).

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

## Architecture (implemented, M11)

`RequestVideoGenerationUseCase -> VideoGenerationService (interface, packages/application) ->`

- `FakeVideoGenerationService` (`packages/data`) — the default everywhere (dev, test, CI).
  Deterministic named scenarios, no real render, no network, no credential.
- `HyperframesCliProvider` (`packages/data`) — shells out to `npx hyperframes render --output
<file>` against `content/video-scripts/<scriptPath>/`. Selected only via
  `VIDEO_GENERATION_PROVIDER=hyperframes`.

The use case never imports Hyperframes directly. Video scripts (HTML/timeline) are stored as
content under `content/video-scripts/<scriptPath>/`, referenced by path only from a
`VideoDefinition`'s `scriptPath` field (`content/languages/<languageId>/videos/<id>.json`).

## BLOCKED/PENDING: real adapter is unverified

`HyperframesCliProvider` is implemented against the verified CLI surface above, but **was never
executed against a real render** in the M11 implementation environment: no FFmpeg/headless
Chrome/`hyperframes` package installation was confirmed available, and
[ADR-015](../../../docs/adr/adr-015-deployment.md) (hosting) is still PENDING. Its unit tests
inject a fake process runner; only the generic child-process wiring (timeout, spawn failure, exit
codes) is exercised for real, against `node`, never against `npx hyperframes`. Before relying on
this adapter in production: confirm the host has Node 22+, FFmpeg and headless Chrome; run a real
`npx hyperframes render` against `content/video-scripts/pl-a1-nasal-vowels-demo/` and inspect the
output; re-check this skill's "Verified" section against the live docs first (active OSS project).

## Cost/ops note

Frame-by-frame headless-browser rendering is CPU-bound — factor render time/compute into whatever
hosting choice [ADR-015](../../../docs/adr/adr-015-deployment.md) settles on. Tracked in
[risk-register.md](../../../docs/risk-register.md) (#1, #9, #11).
