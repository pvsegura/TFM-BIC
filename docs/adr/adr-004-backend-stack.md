# ADR-004: Backend Stack

Status: PROPOSED
Date: 2026-09-15

## Context

Backend needs: TypeScript, REST API (per constitution §11, unless a documented reason says
otherwise — none currently exists, so REST stands), modular structure supporting
controllers/DTOs/use-cases/domain/repositories, good TypeScript-first DX, and low operational
overhead consistent with the modular-monolith decision (ADR-001).

## Decision

**Recommend Fastify** as the HTTP framework, Node.js LTS runtime. **Not yet ACCEPTED** — final
selection happens at scaffold time after re-verifying current Fastify major version, Node LTS
compatibility, and plugin ecosystem status (per
[dependency-management.md](../development/dependency-management.md)); this ADR records the
architectural reasoning, not a pinned version.

## Options considered

- **OPTION A — Fastify (recommended).** Pros: TypeScript-first, JSON-schema validation built in
  (pairs naturally with the Zod-in-contracts approach via a schema bridge), low overhead, plugin
  architecture matches modular-monolith module boundaries well, generally regarded as faster than
  Express for JSON APIs. Cons: smaller ecosystem than Express; some middleware needs a
  Fastify-specific plugin instead of an Express one.
- **OPTION B — Express.** Pros: largest ecosystem, most examples/StackOverflow coverage, team
  familiarity likely highest. Cons: no built-in TypeScript-first validation story, historically
  slower for JSON-heavy APIs, more manual wiring for the layering this project wants.
- **OPTION C — NestJS.** Pros: opinionated modular structure, DI container, decorators map well
  onto controllers/use-cases. Cons: heavier framework, DI/decorator style can pull business logic
  toward framework conventions rather than a framework-agnostic domain layer — some tension with
  ADR-001's "domain depends on nothing external" rule; steeper learning curve for the stated
  layering if not disciplined.

## Consequences

- REST is the API style; GraphQL/tRPC not adopted without a documented reason.
- Whichever framework is picked, controllers/routes stay a thin adapter layer — no business logic
  in route handlers (mirrors the React rule in ADR-003).
- Final pick and version go into a follow-up note in this ADR (or a superseding ADR) once made.

## References

- [architecture-overview.md](../architecture/architecture-overview.md)
- [node-typescript skill](../../.claude/skills/node-typescript/SKILL.md)
