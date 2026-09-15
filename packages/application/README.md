# packages/application

Use cases and service interfaces (e.g. `VideoGenerationService`, `AudioGenerationService`,
`EmailService`, repository interfaces). Depends on `packages/domain` only — never on
`packages/data` implementations or external SDKs directly.

See [architecture-overview.md](../../docs/architecture/architecture-overview.md) and
[ai-integration-strategy.md](../../docs/architecture/ai-integration-strategy.md).
