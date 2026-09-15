# ADR-001: Architecture Style

Status: ACCEPTED
Date: 2026-09-15

## Context

The product must support one initial language (Polish) while being extensible to many, with
video/audio/gamification features, two dashboard types, and a long expected lifetime (built
incrementally over multiple milestones by a small team). It must remain maintainable without
premature distributed-systems complexity.

## Decision

Adopt a **modular monolith** with **Clean/Hexagonal layering**: Presentation → Application →
Domain → Data/Infrastructure, with Domain having zero dependency on infrastructure or external
SDKs. See [architecture-overview.md](../architecture/architecture-overview.md) for the full
layer/dependency-flow diagram.

## Options considered

- **OPTION A — Modular monolith + Hexagonal (chosen).** Single deployable backend, internal
  module boundaries enforced by package structure and dependency rules. Pros: simplest to
  operate, cheapest to host, easiest to refactor module boundaries while requirements are still
  moving. Cons: requires discipline to keep modules decoupled without a hard process boundary.
- **OPTION B — Microservices per bounded context.** Pros: independent scaling/deployment per
  context. Cons: massive operational overhead (service discovery, distributed tracing, network
  failure modes) unjustified for an MVP with unknown load; explicitly rejected per the
  no-overengineering constraint (constitution §5) unless a documented scaling need appears later.
- **OPTION C — CQRS/event sourcing.** Pros: strong audit trail, read/write scaling. Cons:
  significant complexity for a product whose core flows (lesson progress, scoring) are simple
  CRUD-shaped; rejected for the same reason as Option B.

## Consequences

- Package boundaries (`packages/domain`, `packages/application`, `packages/data`) are enforced by
  import discipline (and later, lint rules), not by network boundaries.
- Extracting a service later remains possible because the domain/application code doesn't know
  it's running inside a monolith — but this is deferred until a real need is documented in a new
  ADR.

## References

- [architecture-overview.md](../architecture/architecture-overview.md)
