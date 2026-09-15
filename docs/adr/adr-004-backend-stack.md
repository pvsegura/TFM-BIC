# ADR-004: Backend Stack

Status: ACCEPTED (finalized at M1 scaffold time)
Date: 2026-09-15 (finalized 2026-09-15)

## Context

Backend needs: TypeScript, REST API (per constitution §11, unless a documented reason says
otherwise — none currently exists, so REST stands), modular structure supporting
controllers/DTOs/use-cases/domain/repositories, good TypeScript-first DX, and low operational
overhead consistent with the modular-monolith decision (ADR-001).

## Decision

**Fastify, finalized at M1 scaffold time.** Verified against official sources on 2026-09-15 per
[dependency-management.md](../development/dependency-management.md):

- Fastify `^5.12.4` (current stable; v5 requires Node.js ≥ 20, well within the Node 24 LTS choice
  below).
- Node.js runtime: **24 (Active LTS)**. Verified LTS status: Node 24 is Active LTS as of mid-2026
  (Active until ~Oct 2027, Maintenance after); Node 22 is already in Maintenance LTS. Node 24 also
  still bundles Corepack (removed starting Node 25), which this repo's pnpm workspace setup
  depends on — see the workspace-tooling note in ADR-002.
- No JSON-schema/type-provider plugin adopted yet (`@fastify/type-provider-zod` /
  `fastify-type-provider-zod` exist and were evaluated, but M1's only endpoints — `/health`,
  `/ready` — have no request input to validate; the response is shaped by calling
  `packages/contracts`'s Zod schema directly in the route handler. Revisit once a route needs
  request validation).

Runtime/tooling versions actually pinned in `package.json` are the source of truth if this note
and the lockfile ever disagree.

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
- Controllers/routes stay a thin adapter layer — no business logic in route handlers (mirrors the
  React rule in ADR-003); see `apps/api/src/routes/health.route.ts` for the pattern.
- CORS is not configured in M1 — `apps/web` does not call `apps/api` yet (see ADR-003/M1 scope).
  Add an explicit, non-wildcard CORS policy when that integration lands (see security baseline).

## References

- [architecture-overview.md](../architecture/architecture-overview.md)
- [node-typescript skill](../../.claude/skills/node-typescript/SKILL.md)
