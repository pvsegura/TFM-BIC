# Content Architecture

Status: ACCEPTED (M0), implemented in M5 | Related: [ADR-007](../adr/adr-007-content-architecture.md),
[ADR-018](../adr/adr-018-content-languages.md)

This is the most critical architectural decision for multi-language support: **content is data, not
code.** ADR-018 records _why_ (options, trade-offs); this document is the reference for how it works and
how to extend it.

## Rule

The application works with a `languageId` end to end and never branches on language identity:

```ts
// FORBIDDEN
if (language === "pl") { ... }

// REQUIRED
listContent({ languageId, levelId })
```

There is one `LearnPage`, one `LanguageSelector`, one set of use cases and routes, for every language.
`packages/data/src/content/no-language-branching.test.ts` scans all production source for comparisons
with literal language codes, `case "xx":`, hard-coded language names and per-language identifiers, and
fails CI if any appear. Language identity is allowed in content files, in configuration defaults
(`DEFAULT_LANGUAGE`) and in tests.

## The model

```
Language ──< LanguageLevel >── Level (CEFR, fixed: a1..c2)
   │
   └──< ContentItem (language + level + type + order + status) ──< blocks
```

- **Language** (`language.json`): `code` (ISO 639 lowercase: `pl`), `name`, `nativeName`, `locale`
  (BCP 47 default regional variant, e.g. `pl-PL`), `direction` (`ltr`/`rtl`), `isActive`. The code is
  the identity; language and locale are deliberately distinct so a regional variant can be added
  without re-addressing content.
- **Level**: the six CEFR levels as a constant in `packages/domain` (`CEFR_LEVELS`): stable `id`
  (`a1`), display `label` (`A1`), `rank` (1–6). Levels are a fixed standard, so they are code; the
  app stores **no** CEFR descriptors and makes **no** certification claim.
- **LanguageLevel** (`levels[]` in `language.json`): `id` + `status`. `available` = has published
  content and is selectable; `planned` = "coming soon", shown but never selectable, serves nothing.
  Levels not listed are not offered.
- **ContentItem** (one file each): `id`, `languageId`, `levelId`, `type` (`lesson` | `explanation`),
  `status` (`draft` | `published` | `archived`), `order`, `instructionLanguage`, `title`,
  `description`, `blocks`.
- **Blocks** (structured, plain text): `explanation {text}`, `example {text, translation, note?}`,
  `dialogue {lines: [{speaker, text, translation}]}`.

`languageId` is the language being **learned**; `instructionLanguage` is the language the explanations
and translations are written in (`en` throughout M5). They are separate concepts so that, for example,
Spanish explanations of Polish can exist later; nothing about interface localisation is built yet.

## Folder layout

```
content/
  languages/
    pl/
      language.json                      # metadata + which levels exist and their status
      levels/
        a1/
          content/
            pl-greetings.json            # file name == content id
            pl-introducing-yourself.json
            ...
        a2/ … c2/                        # planned: no content/ folder yet
  exercises/  video-scripts/             # reserved for later milestones (README only)
```

A language is the folder `content/languages/<code>/`; its `language.json` is the only per-language
registration. Files other than `.json` (READMEs) are ignored by the loader.

## Source of truth

| Data                                  | Single authoritative source              | Copies                             |
| ------------------------------------- | ---------------------------------------- | ---------------------------------- |
| Language metadata, level availability | `content/languages/<code>/language.json` | none                               |
| Educational content                   | `content/languages/<code>/levels/…`      | none                               |
| CEFR level ids/labels/ranks           | `CEFR_LEVELS` in `packages/domain`       | API responses (derived at runtime) |
| What the API/UI show                  | derived at request time from the above   | none stored                        |

There is no database copy, no seed and no hard-coded React copy, so there is nothing to synchronise.
M5 has no migrations and no PostgreSQL tables (ADR-018 explains the trade-off and when that changes).

## Access path

```
LearnPage / ContentPage (React, generic; route params only)
  -> catalog-api.ts (fetch, contract-validated)         GET /languages, /languages/:c/levels,
  -> apps/api routes (thin controllers)                     /content?language=&level=, /content/:id
  -> Application use cases (visibility + ordering rules)
  -> ContentRepository port
  -> FileSystemContentRepository (packages/data)  -- validates everything once, at startup
  -> content/languages/**.json
```

The frontend never imports content and the Polish content is not in the JS bundle: it is fetched from
the API. The API resolves no file path from a request — ids and codes are validated against strict
patterns and looked up in memory.

## Validation

`packages/contracts` holds the Zod schemas for the file format (`languageFileSchema`,
`contentFileSchema`, `contentBlockSchema`) and for the API (`*ResponseSchema`, query/param schemas),
built on the domain's own predicates. Three layers run, in this order, by one loader
(`loadContentCatalog`):

1. **Per file**: shape, required fields, enums (level, status, type, direction), bounded lengths,
   plain text only (no control characters, no markup), known block types only, no unknown keys,
   `schemaVersion: 1`.
2. **File vs location**: `languageId`/`levelId`/`code` must match the folder; file name must be
   `<id>.json`; a level folder must be a CEFR id.
3. **Whole catalog** (`validateContentCatalog`): unique language codes and content ids; ids
   namespaced by language (`pl-…`); no content in an undeclared level; unique `order` per
   language+level (any status); published content only in `available` levels; every `available` level
   has published content.

Run it any time with `pnpm content:validate` (exit code 1 and a list of every problem on failure). It
also runs as a Jenkins stage, at API start-up (the server refuses to start on invalid content), and in
Vitest over the shipped tree (`shipped-content.test.ts`).

Limits: a content file may be at most 256 KB; title ≤ 120, description ≤ 300, an explanation ≤ 1000
characters, an example phrase or translation ≤ 200; ≤ 50 blocks per item; a dialogue ≤ 40 lines.

## Ordering, ids, status, versioning

- **Ordering** is the explicit `order` integer (1–100 000, gaps allowed, unique within a language and
  level), ties broken by `id`. Nothing depends on file-system or insertion order. Languages are listed
  by name; levels by CEFR rank.
- **Ids** are permanent, lowercase-slug, language-prefixed (`pl-greetings`). Change titles, text and
  order freely; never change an id — archive the item instead.
- **Status**: only `published` is ever returned to a student. `draft` = being written; `archived` =
  withdrawn but kept in history.
- **Versioning**: `schemaVersion` is the _format_ version; the _revision_ history is Git. There are no
  hand-maintained timestamps.

## Security posture of content

Content is treated as untrusted data: strict schemas, size limits, plain text only, structured blocks
instead of HTML, no executable content, and rendering through React's escaping into fixed components
keyed by block type. An unknown block type fails validation at the source and, if one ever reached the
client, renders a neutral notice with none of its data. See
[security-baseline.md](../security/security-baseline.md).

## How to add a language (data only)

1. Choose the ISO 639-1 code (two letters; three-letter ISO 639-2 only if none exists).
2. Create `content/languages/<code>/language.json` with `name`, `nativeName`, a BCP 47 `locale` whose
   primary subtag is the code, `direction`, `isActive`, and a `levels` list where each level is
   `available` (only if it will have published content) or `planned`.
3. Add content files under `levels/<levelId>/content/<code>-<slug>.json` (file name = id; ids start
   with `<code>-`).
4. `pnpm content:validate`, then `pnpm test`. No application, UI, API or repository code changes.

To add a level to an existing language: change its `status` in `language.json` and add content files.
To add a **content type** or **block type**: a domain constant, a schema and one UI component — a code
change by design, because it changes what the platform can render.

## Authoring and source rules

Content must be original (or properly licensed), never scraped, and no textbook passages are copied. It
is organised **by** CEFR level but is **not** CEFR-certified, and the seed set is not a course. Do not
add "can do" statements or level descriptors without citing the official Council of Europe source and
using concise original wording. Linguistic facts should be checked against reliable references; where
sounds are compared to English, say they are approximate.

## Polish A1 seed content (M5)

Five original items — three lessons (greetings and goodbyes; introducing yourself, including a short
dialogue; please, thank you and sorry) and two explanations (Polish has no articles; a first look at
spelling and sounds). It exists to prove the architecture (metadata, ordering, structured examples,
retrieval, rendering, validation). It is **not** a complete A1 course and does not claim to be.

## Future extension points (not implemented)

Vocabulary sets, phonetics drills, exercises, audio and video (Gemini/Hyperframes), grammar notes, more
levels and languages, and AI-generated content each arrive as new content types/block types plus data,
behind the same port. Moving content into PostgreSQL or a CMS means a new adapter for
`ContentRepository` and a one-way import from these files (ADR-018 lists the triggers).

## Lessons (M6)

Rationale: [ADR-019](../adr/adr-019-lessons.md). M5 = the catalog and a read-only view of content; M6 = the
first student experience on top of it. **Content and progress are different things and are stored apart.**

- **A lesson is a content item with `type: "lesson"`.** Same file, same schema, same id
  (`pl-greetings`), same `status`/`order`/blocks. There is no lessons table, no lesson id or slug, and no
  copy of any lesson field. Lesson pages and routes are generic; nothing names a language.
- **What each side owns.** The JSON files own the lesson (text, blocks, title, description, order, language,
  level, publication). PostgreSQL owns one thing: `lesson_progress`, a student's `in_progress` /
  `completed` state and its times, keyed `(user_id, lesson_id)`. `lesson_id` is the content id held as
  text — not a foreign key, because the referenced rows are files.
- **How the application resolves a lesson.** `GET /lessons/:id` runs `GetContentUseCase` (published, active
  language, `available` level — M5's rules, reused) and then checks `type === "lesson"`; the student's
  progress is then read separately and joined only in the response. `explanation` items are reference
  notes, not lessons, and are not listed or openable as lessons.
- **Publication and validation** are unchanged: `status: published` in the file, `pnpm content:validate`,
  fail-fast loading at start-up. Progress is only ever written for a lesson that exists and is visible;
  a database `CHECK` and the repository re-validate the id shape.
- **Ordering** is M5's explicit `order`, then `id`. The lesson list numbers lessons 1, 2, 3 by position,
  not by the `order` value.
- **Completion** is explicit (a "Complete lesson" action), idempotent, and awards nothing. Opening a lesson
  records it as in progress. **Resume position within a lesson is not part of M6; lesson status is persisted.**
- **Unknown block types** are refused by the schema (the API returns a generic `500` rather than serve
  them); if one ever reached the browser the viewer shows a neutral notice and none of its data.
- **Adding a lesson** is a new file with `type: "lesson"` and `status: published`; nothing else changes.
  A student's existing progress is unaffected by editing a lesson's text or order.

Enrolment — persisting which language/level a student is learning — is still not stored (the URL holds it);
see ADR-019 §8.
