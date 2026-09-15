# ADR-011: AI Integration Architecture

Status: ACCEPTED
Date: 2026-09-15

## Context

Product uses two external AI/media providers (Hyperframes for video, Gemini for audio), both of
which the domain must not depend on directly (constitution §3, §6).

## Decision

Interface-per-capability pattern: `VideoGenerationService` and `AudioGenerationService` interfaces
own by `packages/application`/`packages/contracts`; concrete adapters (`HyperframesProvider`,
`GeminiAudioProvider`) live in `packages/data`. Use cases (e.g. `GenerateLessonVideoUseCase`,
`GenerateLessonAudioUseCase`) depend only on the interface. Full dependency-flow diagram in
[ai-integration-strategy.md](../architecture/ai-integration-strategy.md).

## Options considered

- **OPTION A — Interface + adapter per provider (chosen).** Pros: providers are swappable, domain
  stays testable without network calls, matches ADR-001's hexagonal rule uniformly. Cons: a bit
  more boilerplate (interface + adapter) than calling an SDK directly from a use case.
- **OPTION B — Call provider SDKs directly from use cases.** Pros: less code short-term. Cons:
  violates the hexagonal boundary, makes unit-testing use cases require mocking SDK internals
  instead of a small interface, couples business logic to provider-specific error shapes/retry
  semantics. Rejected.

## Consequences

- No Gemini or Hyperframes types appear in `packages/domain` or `packages/application`'s public
  use-case signatures — only the service interfaces do.
- Provider verification (ADR-012, ADR-013) must happen immediately before adapter implementation,
  not assumed from this ADR, since these are fast-moving external products.

## References

- [ai-integration-strategy.md](../architecture/ai-integration-strategy.md)
