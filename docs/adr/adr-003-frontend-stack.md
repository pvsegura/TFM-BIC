# ADR-003: Frontend Stack

Status: ACCEPTED
Date: 2026-09-15

## Context

The frontend needs to serve interactive lessons, dashboards, exercises with forms/validation,
and multi-language content, with strong type safety and testability.

## Decision

React + TypeScript (strict mode, no `any`) + Vite + React Router + TanStack Query (server state)

- Zustand (only where client state genuinely can't live in TanStack Query/component state) +
  React Hook Form + Zod (form/schema validation, shared with `packages/contracts`) + Tailwind CSS +
  Vitest + React Testing Library + Playwright (E2E). This is a given constraint from the product
  brief, not an open choice — documented here for traceability, not re-derived.

## Options considered

Not re-evaluated: the stack was specified directly. Exact package versions were selected at M1
scaffold time (2026-09-15) per [dependency-management.md](../development/dependency-management.md)
— current stable releases verified against official sources: React `^19.3.0`, Vite `^8.3.0`,
React Router `^8.3.1` (v8 dropped the `react-router-dom` package — DOM APIs now come from
`react-router/dom`, everything else from `react-router`), TanStack Query `^5.102.8`, Zustand
`^5.0.15`, React Hook Form `^7.88.0`, Zod `^4.4.3`, Tailwind CSS `^4.3.2` (CSS-first config, no
`tailwind.config.js`; dark mode implemented via a custom `@custom-variant dark` toggled by a
`.dark` class rather than only `prefers-color-scheme`, to support the required manual toggle),
Vitest `^5.0.0`, React Testing Library `^16.3.3`, Playwright `^1.63.0`. TypeScript is pinned to
the `6.0.x` line (see the node-typescript/ADR-004 note on why TypeScript 7 was rejected for now:
`typescript-eslint`'s supported range doesn't extend to it yet).

## Consequences

- Zustand usage must be justified per store (constitution: "cuando realmente sea necesario") —
  default to TanStack Query + component state first.
- No business logic in components (constitution §5/architecture-overview.md) — components call
  hooks/services that call the API client.
- Strict TypeScript is a CI gate (typecheck step), not just an editor setting.

## References

- [architecture-overview.md](../architecture/architecture-overview.md)
- [react-typescript skill](../../.claude/skills/react-typescript/SKILL.md)
