---
name: react-typescript
description: Frontend conventions for this project - React, TypeScript strict mode, Vite, React Router, TanStack Query, Zustand, React Hook Form, Zod, Tailwind. Use when writing or reviewing apps/web code.
---

# React / TypeScript Frontend

Stack decided in [ADR-003](../../../docs/adr/adr-003-frontend-stack.md) — versions PENDING,
resolve via [dependency-upgrades](../dependency-upgrades/SKILL.md) at scaffold/install time.

## Rules

- TypeScript **strict mode**, no `any`. Prefer precise types from `packages/contracts` over
  redefining shapes locally.
- No business logic in components — data fetching/mutation via hooks using TanStack Query calling
  the API client; validation via Zod schemas shared with `packages/contracts`; forms via React
  Hook Form + the same Zod schema (single source of truth for shape/validation).
- Zustand only when state genuinely can't live in TanStack Query (server state) or local component
  state — justify each store.
- Separate concerns into: `components/`, `pages/`, `layouts/`, `hooks/`, `state/`, `services/`,
  API clients, `schemas/`, `types/`, `utilities/` (per constitution §10).
- No per-language components (`PolishVocabularyPage`, etc.) — one generic page, parameterized by
  `languageId`. See [content-authoring](../content-authoring/SKILL.md).
- Accessibility: keyboard navigation, loading/empty/error states, light+dark mode support on every
  new screen (dark mode must not be an afterthought — see
  [docs/architecture](../../../docs/architecture/architecture-overview.md) NFRs).

## Testing

Vitest + React Testing Library, behavior-focused (see [testing skill](../testing/SKILL.md)).
