# packages/domain

Entities, value objects, and domain services. **No external dependencies** — no infrastructure,
no PostgreSQL, no Gemini/Hyperframes SDK, no React. This is the innermost layer of the hexagon.

Bounded-context analysis: [docs/architecture/domain-model.md](../../docs/architecture/domain-model.md).

## What's here (M1)

`LanguageId` (`src/language/`) — a validated value object for the ISO-639-style language codes
used throughout `content/languages/<languageId>/...`. It's a foundational, cross-cutting
primitive rather than a business feature, chosen to prove the domain package builds/tests in
complete isolation (only depends on `@tfm-bic/shared`'s `Brand` type utility) ahead of real
bounded-context entities (User, Lesson, Exercise, ...) landing in later milestones.
