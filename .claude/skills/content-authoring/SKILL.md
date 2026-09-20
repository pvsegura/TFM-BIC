---
name: content-authoring
description: How to structure and author language-learning content under content/languages - schema-validated JSON, languageId-parameterized, never hardcoded into React. Use when adding or editing languages, levels, lesson/explanation content, or any content schema.
---

# Content Authoring

Full docs: [docs/architecture/content-architecture.md](../../../docs/architecture/content-architecture.md),
[ADR-018](../../../docs/adr/adr-018-content-languages.md) (refines [ADR-007](../../../docs/adr/adr-007-content-architecture.md)).

## Golden rule

Content is data under `content/languages/<languageId>/`. Never create per-language components, use
cases, routes or repositories, and never hard-code language names or lesson text into `apps/`,
`packages/`. A new language is a new content tree, not new code.

## Layout (implemented in M5)

```
content/languages/<code>/language.json                              metadata + levels: [{id, status}]
content/languages/<code>/levels/<a1..c2>/content/<contentId>.json   one item per file; file name = id
```

- `language.json`: `schemaVersion: 1`, `code` (ISO 639-1 lowercase), `name`, `nativeName`, `locale`
  (BCP 47, primary subtag = code), `direction` (`ltr`|`rtl`), `isActive`, `levels`. A level is
  `available` (has published content, selectable) or `planned` ("coming soon", never selectable).
- Content item: `id` (`<code>-<slug>`, permanent), `languageId`, `levelId`, `type` (`lesson` |
  `explanation`), `status` (`draft`|`published`|`archived`), `order` (unique per language+level),
  `instructionLanguage`, `title`, `description`, `blocks`.
- Blocks: `explanation {text}`, `example {text, translation, note?}`, `dialogue {lines[{speaker,text,translation}]}`.
  Plain text only — no HTML/markup, no line breaks, no control characters.

## Validate

`pnpm content:validate` (same loader as the API start-up; also a Jenkins stage and a Vitest suite over
the shipped tree). It reports every problem at once.

## Rules of authorship

- Original or properly licensed content only; never scrape or copy textbook passages.
- Verify linguistic facts against reliable references; say when a sound comparison is approximate.
- Organise by CEFR level, but do **not** state or imply CEFR certification, and do not add CEFR
  "can do" descriptors without citing the official Council of Europe source and using concise
  original wording. Never describe a seed set as a complete course.
- Do not publish (`status: published`) content in a `planned` level, and do not mark a level
  `available` without at least one published item — the validator rejects both.
- New content **types** or **block types** are code changes (domain constant + schema + UI component);
  new languages, levels and items are not.

## Access pattern

UI/API code reads content only through the `ContentRepository` port / the public API, never by reading
`content/` paths from a component or scattering filesystem logic across the app.
