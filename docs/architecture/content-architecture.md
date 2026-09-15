# Content Architecture

Status: ACCEPTED (M0) | Related: [ADR-007](../adr/adr-007-content-architecture.md)

This is the most critical architectural decision for multi-language support: **content is data,
not code.**

## Rule

The application must work with a `languageId` parameter end-to-end. It must never branch on
language identity in application/UI code:

```ts
// FORBIDDEN
if (language === 'polish') { ... }

// REQUIRED
loadLessons(languageId, levelId)
```

No `components/polish/`, no `PolishVocabularyPage`. There is exactly one `VocabularyPage`,
`LessonPage`, etc., all parameterized by `languageId`.

## Folder layout

```
content/
  languages/
    pl/
      language.json
      levels/
        a1/
          course.json
          lessons/
          vocabulary/
        a2/
        b1/
        b2/
        c1/
        c2/
      vocabulary/
      phonetics/
      metadata/
    en/   (future)
    es/   (future)
    de/   (future)
    fr/   (future)
    it/   (future)
    pt/   (future)
  exercises/        (exercise-type definitions shared across languages)
  video-scripts/    (Hyperframes scene scripts, see ai-integration-strategy.md)
```

This skeleton exists under `content/languages/pl/` as of M0 (empty, `.gitkeep`-equivalent
placeholders) — no lesson content authored yet.

## Access path

```
VocabularyPage (React, generic)
  -> languageId (route/state param)
  -> Vocabulary API / repository (packages/data, or a content-loader in M0/MVP)
  -> content/languages/<languageId>/vocabulary/*.json
```

In MVP, `content/` files may be read directly by the API layer (via a `ContentRepository`
interface implemented by a filesystem adapter). The interface must be designed so the
implementation can be swapped later for a CMS or database-backed adapter **without changing the
domain or application layer** — only a new adapter in `packages/data` is added.

## Content schema (conceptual — no schema implemented yet in M0)

Planned Zod/JSON-schema-validated shape per content type:

- **Vocabulary entry**: `language`, `level`, `lesson`, `category`, `word`, `meaning`, `example`,
  `pronunciation`, `audioRef`, `metadata`.
- **Lesson**: id, level, order, title, objectives, references to video script, vocabulary set,
  exercise set.
- **Course** (`course.json`): level id, ordered lesson ids, skill coverage (grammar, listening,
  etc. — see [MVP](../product/mvp.md) for the skill list).

Validation approach (schemas, not data) will use `zod`, shared from `packages/contracts`, so both
a future content-authoring tool and the API validate against the same source of truth. Schema
definitions are deferred to the milestone that implements content authoring — not created in M0
to avoid speculative code ahead of a concrete authoring workflow.

## Educational levels

A1–C2 per language, aligned conceptually with internationally recognized language-proficiency
level naming (the CEFR naming convention is widely used for this A1–C2 scale). **The exact
competency requirements per level are not verified against an official source in M0** — content
authors must consult the authoritative reference when writing `course.json` for each level rather
than relying on assumptions baked into this document. UNKNOWN: whether any certification-body
compliance is required for this product; PENDING product decision.

Each level's content model must be able to express: grammar, vocabulary, reading, listening,
writing, speaking, phonetics/pronunciation, exercises, video lessons, revision — as content
categories, not as separate code paths.

## Migration path

Because access goes through a `ContentRepository` interface, moving from flat JSON files to a
headless CMS or a `content` database schema later requires: (1) a new adapter implementing the
same interface, (2) a migration script, (3) no changes to domain, application, or React
components. This is the explicit reason the interface boundary exists now, even though the
filesystem-backed implementation is simple.
