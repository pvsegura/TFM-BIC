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
Hyperframes SDK, no React. This is the rule most likely to be violated by a careless change —
check it before adding an import to anything in `packages/domain` or `packages/application`.

## External services

Never called directly from domain/application logic. Always: interface (owned by
application/contracts) → adapter (in `packages/data`) → real provider.
`VideoGenerationService` → `HyperframesProvider` → Hyperframes.
`AudioGenerationService` → `GeminiAudioProvider` → Gemini API.
`EmailService` → provider adapter (provider PENDING, ADR-014).

## Content

`content/languages/<languageId>/...` — data, not code. Never branch on language identity
(`if (language === 'polish')`) in application or UI code; parameterize by `languageId` instead.
See [docs/architecture/content-architecture.md](../docs/architecture/content-architecture.md).

## Monorepo layout

`apps/{web,api}`, `packages/{domain,application,contracts,data,shared,ui,config,testing}`,
`content/`, `infrastructure/`, `tests/{e2e,integration}`, `docs/`, `.claude/`. Full rationale:
[docs/architecture/folder-structure.md](../docs/architecture/folder-structure.md).

## Bounded contexts

Identity & Auth, Users, Student Profile, Teachers/Students, Languages, Courses/Levels, Lessons,
Exercises, Scoring/Progress, Gamification, Vocabulary, Phonetics, Media, Email, Newsletter,
Subscriptions, Invitations, Privacy & Data Management. Relationships:
[docs/architecture/domain-model.md](../docs/architecture/domain-model.md).

## Key constraint

No AWS. No microservices/CQRS/event-sourcing without a documented ADR justifying the exception —
default is modular monolith.
