---
name: content-authoring
description: How to structure and author language-learning content under content/languages - schema-validated, languageId-parameterized, never hardcoded into React. Use when adding or editing lesson/vocabulary/phonetics content, or any content schema.
---

# Content Authoring

Full doc: [docs/architecture/content-architecture.md](../../../docs/architecture/content-architecture.md),
[ADR-007](../../../docs/adr/adr-007-content-architecture.md).

## Golden rule

Content is data under `content/languages/<languageId>/...`. Never create per-language components
or hardcode lesson text into `apps/web`. A new language is a new content tree, not new code.

## Layout

```
content/languages/<languageId>/language.json
content/languages/<languageId>/levels/<a1..c2>/course.json
content/languages/<languageId>/levels/<a1..c2>/lessons/
content/languages/<languageId>/levels/<a1..c2>/vocabulary/
content/languages/<languageId>/vocabulary/
content/languages/<languageId>/phonetics/
content/languages/<languageId>/metadata/
content/exercises/        (exercise-type definitions, shared across languages)
content/video-scripts/    (Hyperframes scene scripts)
```

## Validation

Content is validated against schemas (planned: Zod, shared from `packages/contracts`) — no schema
exists yet as of M0. When authoring the first schema, design it so a future CMS/DB-backed
`ContentRepository` adapter can validate the same shape, not just the filesystem one.

## Educational-level content

A1–C2 per language. Don't assert specific official competency requirements per level without
citing a verified source — see [content-architecture.md](../../../docs/architecture/content-architecture.md)
for the current UNKNOWN flag on this.

## Access pattern

UI/API code reads content through a `ContentRepository` interface, never by reading
`content/languages/...` paths directly from a React component or scattering filesystem logic
across the app.
