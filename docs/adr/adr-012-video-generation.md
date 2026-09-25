# ADR-012: Video Generation (Hyperframes)

Status: ACCEPTED (architecture and fake-provider path) — the real `HyperframesCliProvider`
adapter is implemented but **not verified end-to-end** (see Consequences)
Date: 2026-09-15, revised 2026-09-24 (M11)

## Context

Educational videos need narration, animation, examples, subtitles. Product brief specifies
Hyperframes as the tool, explicitly forbids implementing the integration before verifying its
real API/capabilities. M0 verified Hyperframes' general shape (open-source, self-hostable,
free); M11 re-verified its live documentation immediately before implementation, per that
requirement.

## Decision

**Re-verified 2026-09-24** (sources: `hyperframes.heygen.com/introduction`,
`hyperframes.heygen.com/quickstart`, `github.com/heygen-com/hyperframes`):

- Hyperframes is HeyGen's open-source (Apache 2.0), self-hostable framework that renders
  HTML/CSS/JS timelines (`data-start`/`data-duration`/`data-track-index` attributes, with
  CSS/GSAP/Lottie/Three.js animation) into deterministic MP4 via frame-by-frame headless-Chrome
  capture, encoded with FFmpeg.
- Local/self-hosted rendering is invoked via `npx hyperframes render --output <file>` against a
  pre-authored project folder, or programmatically via the `@hyperframes/producer` Node package
  (exact function signature not verified). **No authentication is required for local rendering**
  and it uses no HeyGen credits — confirmed directly from the quickstart page. A separate
  `npx hyperframes cloud render` path exists for HeyGen-hosted rendering, which does require
  authentication; this project does not use it.
- Requirements for local rendering: **Node 22+, FFmpeg, and headless Chrome** on the host.
- The tool is designed to be used interactively by an AI coding agent at content-authoring time
  (a `/hyperframes` skill command that generates the HTML/timeline project), not as a synchronous
  runtime API called per end-user request — the "generation" our platform automates is the
  _rendering_ of an already-authored project, not the authoring of its HTML/timeline itself.

**Architecturally accepted and implemented** (M11): a `VideoGenerationService` interface
(`packages/application/src/video/ports/video-generation-service.ts`), implemented by:

- `FakeVideoGenerationService` (`packages/data`) — the default everywhere (dev, test, CI):
  deterministic named scenarios (success, provider-rejected, provider-unavailable, timeout), no
  network, no credential, no real render.
- `HyperframesCliProvider` (`packages/data`) — shells out to `npx hyperframes render --output
<file>` against the video's render project under `content/video-scripts/<scriptPath>`, with a
  timeout and typed error translation. Selected only via `VIDEO_GENERATION_PROVIDER=hyperframes`.

A `VideoDefinition` (content, `content/languages/<languageId>/videos/<id>.json`) names only
provider-independent metadata (language, level, title, description, an optional pointer to
existing content, and a `scriptPath`); the render project itself (Hyperframes-specific HTML) lives
under `content/video-scripts/<scriptPath>/` and is read only by the adapter — never by the
domain/application layers. Generation is modeled as a job with lifecycle `queued -> processing ->
completed|failed`, persisted in `video_generation_jobs`, because self-hosted Hyperframes rendering
is CPU-bound and not instant, and has no verified webhook/job-status API of its own for the local
path — see `docs/architecture/ai-integration-strategy.md` for the full job-lifecycle rationale.

## Options considered

Only one provider was specified by the brief (Hyperframes); no alternative video-generation
provider was evaluated. If Hyperframes proves unworkable at real-render time (e.g., rendering
compute cost too high for the chosen host, or the CLI/API surface having changed since this
re-verification), that would require a new ADR, not a silent substitution.

## Consequences

- **The real `HyperframesCliProvider` is implemented but unverified end-to-end.** No FFmpeg,
  headless Chrome, or `hyperframes` package installation was confirmed available in the M11
  implementation environment, and [ADR-015](adr-015-deployment.md) (hosting) is still PENDING, so
  whether the eventual deployment target can run this at all is unknown. The adapter's own unit
  tests inject a fake process runner rather than invoking a real subprocess (see
  `packages/data/src/video/hyperframes-cli.provider.test.ts`); its child-process wiring itself
  (timeout, spawn failure, exit codes) is exercised for real, but against `node`, never against
  `npx hyperframes`. Real verification is explicit future work — see
  `content/video-scripts/README.md`.
- Rendering compute cost/time is an operational risk (headless-browser frame capture is not free
  in CPU terms) — tracked in [risk-register.md](../risk-register.md).
- The video-script format (HTML/timeline) is de facto content — `content/video-scripts/` holds one
  hand-authored example (`pl-a1-nasal-vowels-demo`), documented in that folder's README.
- Generation is an in-process, non-durable background task (not awaited by the HTTP request
  handler, not a queue) — an explicit MVP limitation: no retry, no cross-restart durability, single
  server instance only. A later milestone can introduce durable background work if load or
  reliability requirements make that necessary.
- Media storage is explicitly **PENDING**: neither provider returns (or is expected to return) a
  publicly servable URL in this milestone. `mediaReference` is stored and returned by the API, but
  the frontend shows a "preview pending" notice rather than a `<video>` element pointed at an
  unusable reference. No AWS/S3 was introduced to solve this.

## References

- [ai-integration-strategy.md](../architecture/ai-integration-strategy.md)
- [hyperframes.heygen.com/introduction](https://hyperframes.heygen.com/introduction)
- [hyperframes.heygen.com/quickstart](https://hyperframes.heygen.com/quickstart)
- [GitHub: heygen-com/hyperframes](https://github.com/heygen-com/hyperframes)
- [content/video-scripts/README.md](../../content/video-scripts/README.md)
- [hyperframes skill](../../.claude/skills/hyperframes/SKILL.md)
