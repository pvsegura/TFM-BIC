# ADR-012: Video Generation (Hyperframes)

Status: PROPOSED (architecture only; integration not implemented)
Date: 2026-09-15

## Context

Educational videos need narration, animation, examples, subtitles. Product brief specifies
Hyperframes as the tool, explicitly forbids implementing the integration before verifying its
real API/capabilities.

## Decision

Verified (2026-09-15, see [ai-integration-strategy.md](../architecture/ai-integration-strategy.md)
for full citations): Hyperframes is HeyGen's open-source (Apache 2.0), self-hostable HTML→MP4
renderer — free, no AWS dependency for self-hosted use. **Architecturally accepted**: build a
`VideoGenerationService` interface, implemented by a `HyperframesProvider` adapter that generates
an HTML/timeline script (stored under `content/video-scripts/`) and invokes the renderer.

**Not yet accepted (PENDING/UNKNOWN)**: the exact CLI/API surface, authentication model, output
storage handling, and whether self-hosted rendering compute (headless-browser rendering is
CPU-bound) fits within whatever hosting target ADR-015 picks. These must be re-verified against
`hyperframes.heygen.com`'s full docs immediately before implementation, since this is an actively
evolving open-source project (per search results dated 2026, it appears to have been open-sourced
recently) and details may have changed since this research.

## Options considered

Only one provider was specified by the brief (Hyperframes); no alternative video-generation
provider was evaluated in M0. If Hyperframes proves unworkable at implementation time (e.g.,
rendering compute cost too high for the chosen host), that would require a new ADR, not a silent
substitution.

## Consequences

- Rendering compute cost/time is an operational risk (headless-browser frame capture is not free
  in CPU terms) — tracked in [risk-register.md](../risk-register.md).
- The video-script format (HTML/timeline) becomes de facto content — content authors need this
  format documented once implementation starts (see
  [hyperframes skill](../../.claude/skills/hyperframes/SKILL.md)).

## References

- [ai-integration-strategy.md](../architecture/ai-integration-strategy.md)
- [hyperframes.heygen.com/introduction](https://hyperframes.heygen.com/introduction)
- [GitHub: heygen-com/hyperframes](https://github.com/heygen-com/hyperframes)
