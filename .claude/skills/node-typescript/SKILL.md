---
name: node-typescript
description: Backend conventions for this project - Node.js, TypeScript, REST API, modular structure (controllers, DTOs, use cases, domain, repositories). Use when writing or reviewing apps/api or packages/application|domain|data code.
---

# Node.js / TypeScript Backend

Framework: recommended Fastify, not yet ACCEPTED ([ADR-004](../../../docs/adr/adr-004-backend-stack.md)).
REST API style (per constitution §11, unless a documented ADR says otherwise).

## Layer responsibilities

- **Controllers/routes** (`apps/api`): thin — parse/validate request (via Zod schemas from
  `packages/contracts`), call a use case, map result to HTTP response. No business logic.
- **DTOs/contracts** (`packages/contracts`): shared request/response shapes, Zod-validated.
- **Use cases** (`packages/application`): orchestrate domain + repository/service interfaces.
- **Domain** (`packages/domain`): entities, value objects, business rules — no external imports.
- **Repositories/adapters** (`packages/data`): implement domain/application-owned interfaces;
  only place `pg` or a query builder is imported.

## Cross-cutting

- **Error handling**: consistent error shape at the API boundary; domain/application throw
  typed domain errors, not raw framework errors.
- **Logging**: structured logs, request IDs (see [docs/architecture/architecture-overview.md](../../../docs/architecture/architecture-overview.md)
  NFRs and constitution §37 observability).
- **Config**: environment variables validated at startup (`packages/config`) — fail fast on
  missing/malformed config, per [environments.md](../../../docs/deployment/environments.md).
- **AuthN/authZ**: enforced server-side always — see
  [security skill](../security/SKILL.md) and [ADR-006](../../../docs/adr/adr-006-authentication.md).

## Testing

Domain/application tests require no I/O. Repository/adapter code gets both a fast unit test (fake
driver) and an integration test in `tests/integration/` (real test DB) — see
[testing skill](../testing/SKILL.md).
