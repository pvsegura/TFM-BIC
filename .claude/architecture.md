# Architecture Summary

Full detail: [docs/architecture/](../docs/architecture/). This is the condensed version for
between-session recall — don't treat it as more authoritative than the linked docs.

## Layering (strict, one direction)

```
React UI -> hooks/presentation services -> API client -> Contracts
  -> Node API (routes/controllers) -> Application (use cases) -> Domain
  -> Repository interfaces -> Data/Infrastructure -> PostgreSQL
```

Domain (`packages/domain`) imports nothing external — no infra, no PostgreSQL client, no Gemini/
Hyperframes SDK, no React (`packages/shared`'s pure type utilities are the one allowed dependency).
This is the rule most likely to be violated by a careless change — check it before adding an
import to anything in `packages/domain` or `packages/application`. Enforced by an ESLint
`no-restricted-imports` rule scoped to both `packages/domain/src/**` and
`packages/application/src/**` in `eslint.config.mjs`, plus code review — see
`packages/domain/src/identity/` → `packages/application/src/identity/` →
`packages/data/src/identity/` (Drizzle/Argon2/Crypto adapters) → `apps/api/src/routes/
auth.route.ts` for the full, real Identity & Authentication chain (M3), or
`apps/api/src/routes/health.route.ts` for the smaller M1 example.

## External services

Never called directly from domain/application logic. Always: interface (owned by
application/contracts) → adapter (in `packages/data`) → real provider.
`VideoGenerationService` → `HyperframesProvider` → Hyperframes.
`AudioGenerationService` → `GeminiAudioProvider` → Gemini API.
`EmailService` → `InMemoryEmailService` (the only adapter wired — no real provider account
exists; Resend is the documented target, ADR-014).

## Content

`content/languages/<languageId>/...` — data, not code. Never branch on language identity
(`if (language === 'polish')`) in application or UI code; parameterize by `languageId` instead.
See [docs/architecture/content-architecture.md](../docs/architecture/content-architecture.md).

## Monorepo layout

`apps/{web,api}`, `packages/{domain,application,contracts,data,shared,ui,config,testing}`,
`content/`, `infrastructure/`, `tests/{e2e,integration}`, `docs/`, `.claude/`. Full rationale:
[docs/architecture/folder-structure.md](../docs/architecture/folder-structure.md). Tooling: pnpm
workspaces ([ADR-002](../docs/adr/adr-002-monorepo.md)); every workspace package's `main`/`types`
point at `src/index.ts` (TypeScript source, not a pre-built `dist/`) — Vite/Vitest/`tsx` all
transpile on the fly, so there's no build-order coupling in dev. `pnpm -r <script>` still runs in
each package's own dependency order.

## Bounded contexts

Identity & Auth, Users, Student Profile, Teachers/Students, Languages, Courses/Levels, Lessons,
Exercises, Scoring/Progress, Gamification, Vocabulary, Phonetics, Media, Email, Newsletter,
Subscriptions, Invitations, Privacy & Data Management. Relationships:
[docs/architecture/domain-model.md](../docs/architecture/domain-model.md).

## Key constraint

No AWS. No microservices/CQRS/event-sourcing without a documented ADR justifying the exception —
default is modular monolith.
