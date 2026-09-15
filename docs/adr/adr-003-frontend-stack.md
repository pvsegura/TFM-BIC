# ADR-003: Frontend Stack

Status: ACCEPTED
Date: 2026-09-15

## Context

The frontend needs to serve interactive lessons, dashboards, exercises with forms/validation,
and multi-language content, with strong type safety and testability.

## Decision

React + TypeScript (strict mode, no `any`) + Vite + React Router + TanStack Query (server state)
+ Zustand (only where client state genuinely can't live in TanStack Query/component state) +
React Hook Form + Zod (form/schema validation, shared with `packages/contracts`) + Tailwind CSS +
Vitest + React Testing Library + Playwright (E2E). This is a given constraint from the product
brief, not an open choice — documented here for traceability, not re-derived.

## Options considered

Not re-evaluated: the stack was specified directly. The one internal choice left open is
**exact package versions**, which are PENDING and must be selected per
[dependency-management.md](../development/dependency-management.md) at scaffold time (check
current stable release, Node compatibility, peer deps) rather than assumed now.

## Consequences

- Zustand usage must be justified per store (constitution: "cuando realmente sea necesario") —
  default to TanStack Query + component state first.
- No business logic in components (constitution §5/architecture-overview.md) — components call
  hooks/services that call the API client.
- Strict TypeScript is a CI gate (typecheck step), not just an editor setting.

## References

- [architecture-overview.md](../architecture/architecture-overview.md)
- [react-typescript skill](../../.claude/skills/react-typescript/SKILL.md)
