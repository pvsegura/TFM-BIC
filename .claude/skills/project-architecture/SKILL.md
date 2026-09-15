---
name: project-architecture
description: Enforce the modular-monolith / Clean-Hexagonal layering and monorepo boundaries for this project. Use before adding any new file, import, or module.
---

# Project Architecture

Full docs: [docs/architecture/](../../../docs/architecture/), [ADR-001](../../../docs/adr/adr-001-architecture-style.md), [ADR-002](../../../docs/adr/adr-002-monorepo.md).

## Rules to check before writing code

1. **Dependency direction**: `packages/domain` imports nothing external (no infra, no PostgreSQL,
   no Gemini/Hyperframes SDK, no React). `packages/application` imports `packages/domain` and
   interfaces it defines, not `packages/data` implementations. `packages/data` implements
   interfaces from domain/application — the only place external SDKs/DB drivers are imported.
2. **No business logic in React components** — components call hooks/services; logic lives in
   `packages/domain`/`packages/application`.
3. **No business logic in API route handlers** — controllers are thin, call use cases.
4. **External services** (video, audio, email) are always interface → adapter → provider, never
   called directly from a use case. See [ai-integration-strategy.md](../../../docs/architecture/ai-integration-strategy.md).
5. **No per-language branching** (`if (language === 'polish')`) — parameterize by `languageId`.
6. **No microservices/CQRS/event-sourcing/Kubernetes** without a new ADR documenting a real,
   current need — default is the modular monolith.

## When adding a new module/package

Check [domain-model.md](../../../docs/architecture/domain-model.md) for which bounded context it
belongs to before creating a new one — avoid a "God Domain" package.

## When unsure

If a proposed structure isn't covered by [folder-structure.md](../../../docs/architecture/folder-structure.md),
treat it as an architectural decision requiring a new ADR, not a silent addition.
