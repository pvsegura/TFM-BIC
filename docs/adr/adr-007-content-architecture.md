# ADR-007: Content Architecture

Status: ACCEPTED
Date: 2026-09-15

## Context

Product must support Polish first, then arbitrary further languages, without duplicating
application code per language.

## Decision

Content is stored under `content/languages/<languageId>/...` (see
[content-architecture.md](../architecture/content-architecture.md)), addressed everywhere by
`languageId`, validated against shared schemas (planned: Zod, from `packages/contracts`), and
accessed through a `ContentRepository` interface so the storage mechanism (filesystem now, CMS/DB
later) can change without touching domain/application/UI code.

## Options considered

- **OPTION A — Data-driven content tree (chosen).** Pros: adding a language is a data change, not
  a code change; content can be authored/reviewed independently of app releases; migration to a
  CMS later is a swap of one adapter. Cons: requires disciplined schema validation to avoid
  malformed content silently breaking lessons.
- **OPTION B — Per-language React components/pages.** Pros: none significant for this product's
  goals. Cons: explicitly the anti-pattern the brief forbids — N languages means N component
  trees, N times the maintenance, and business logic inevitably leaks into per-language
  components. Rejected.
- **OPTION C — Content directly in a database from day one.** Pros: no filesystem/CMS migration
  step later. Cons: no authoring/review tooling exists yet in M0; premature for MVP content
  volume (one language, six levels). Deferred — the `ContentRepository` interface keeps this
  option open without committing to it now.

## Consequences

- No `if (language === 'polish')` branches are permitted in application or UI code — code review
  should reject them.
- Content schemas must be versioned/validated; malformed content should fail fast (e.g., at build
  or content-load time), not silently render broken lessons.

## References

- [content-architecture.md](../architecture/content-architecture.md)
- [content-authoring skill](../../.claude/skills/content-authoring/SKILL.md)
