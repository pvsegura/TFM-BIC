# packages/application

Use cases and service interfaces (e.g. `VideoGenerationService`, `AudioGenerationService`,
`EmailService`, repository interfaces). Depends on `packages/domain` only — never on
`packages/data` implementations or external SDKs directly.

See [architecture-overview.md](../../docs/architecture/architecture-overview.md) and
[ai-integration-strategy.md](../../docs/architecture/ai-integration-strategy.md).

## What's here (M1)

A `Clock` port and `GetHealthStatusUseCase` (`src/health/`) — proves the use-case pattern (depend
on a port, not on `Date.now()` or `packages/data` directly) with a real, testable example ahead
of any business use case (registration, scoring, etc.) existing.
