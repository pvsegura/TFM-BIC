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
          exercises/
            pl-greetings-polite-hello.json   # file name == exercise id (M7)
            ...
        a2/ … c2/                        # planned: no content/ folder yet
  exercises/  video-scripts/             # `exercises/` is only a pointer (README); video-scripts is reserved
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

Audio and video (Gemini/Hyperframes), pronunciation evaluation, grammar notes, more levels and languages,
and AI-generated content each arrive as new content types/block types plus data, behind the same port (or,
for vocabulary, exercises and phonetics, the sibling `VocabularyRepository`/`ExerciseRepository`/
`PhoneticContentRepository` ports — see below and [exercise-architecture.md](exercise-architecture.md)).
Moving content into PostgreSQL or a CMS means a new adapter for the repository port and a one-way import
from these files (ADR-018 lists the triggers).

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

## Exercises (M7)

Rationale: [ADR-020](../adr/adr-020-exercises.md); reference: [exercise-architecture.md](exercise-architecture.md). Exercises
follow the same rule as lessons: **content is files, the student's activity is the only thing in PostgreSQL.**

- **An exercise is a file** under `levels/<level>/exercises/<exercise-id>.json` — `id`, `lessonId`, `languageId`, `levelId`,
  `type`, `status`, `order`, `instructionLanguage`, `prompt`, optional `explanation`, and a `configuration` whose shape
  depends on `type` (`multiple-choice`, `text-answer`, `true-false`). It has its own id space (language-prefixed,
  never equal to a content id) and is tied to a **lesson** of the same language and level.
- **What each side owns.** The files own the exercise (prompt, options, answer key, order, publication). The
  application owns how an answer is judged (per-type evaluators) and what a student may see (per-type presenters).
  PostgreSQL owns only `exercise_attempts`.
- **Validation** is the same loader as all content (`pnpm content:validate`, the Jenkins stage, API start-up). Per file: a
  strict schema per type. Catalog-wide: unique ids that never overlap content ids, the lesson must exist, be a
  lesson and share the exercise's language and level, unique `order` within a lesson, and published exercises only on
  published lessons in `available` levels. Invalid exercises stop the API from starting.
- **Ordering** is `order` within the lesson, ties by id. **Status** is the content status model; only `published`
  exercises of a visible lesson are ever returned, all other cases being one `404`.
- **Answer keys** live only in the files and the server. The presentation an API returns before an answer is built
  field by field and never includes them.
- **Adding an exercise** is a file; adding an exercise _type_ is code (schema, evaluator, presenter, view).

### Polish A1 seed exercises (M7)

Nine original exercises across the three types, attached to the three existing lessons (greetings, introducing
yourself, please/thank you/sorry). Every fact restates something already stated in the lesson. It exists to prove
the engine; it is **not** a complete A1 exercise bank and does not claim to be.

## Vocabulary (M9)

Rationale: [ADR-022](../adr/adr-022-vocabulary.md). Vocabulary follows the same rule as lessons and exercises:
**content is files, the student's own relationship to a word is the only thing in PostgreSQL.**

- **A category is a file, an entry is one item in it.** `content/languages/<languageId>/vocabulary/<categoryId>.json`
  holds a `VocabularyCategory` (id, status, order, title, description?, instructionLanguage) and its `items`
  (`VocabularyItem`s). An entry inherits `languageId`, `categoryId` and `instructionLanguage` from its file — they
  are never repeated per entry, so an entry can never disagree with its own category about them.
- **What every entry has, and what is optional.** Required: `id`, `lemma`, `translation`, `status`, `order`.
  Optional: `levelId` (pedagogical placement, not certification — same rule as lesson/exercise levels),
  `partOfSpeech`, `gender`, `plural`, `note`, `example` (`{ text, translation }`). Nothing is padded for a language
  that does not have the concept (no gender field for English, no plural for a numeral).
- **Lemma, not word form.** An entry is one lexical unit; `VocabularyItemId` identifies the lemma and is a stable
  slug picked by the author, never derived from the lemma's spelling (a lemma may carry diacritics or be a phrase).
  M9 does not model inflected forms beyond `plural`; see ADR-022 §3 for why the shape does not block adding them later.
- **What each side owns.** The files own the entry (lemma, meaning, grammar, category, order, publication).
  PostgreSQL owns only `user_vocabulary`: a student's `saved`/`learning`/`learned` status and its times, keyed
  `(user_id, vocabulary_item_id)`. `vocabulary_item_id` is the content id held as text — not a foreign key, same
  reasoning as `lesson_id`/`source_id` elsewhere.
- **Validation** is the same loader as all content: per file, a strict schema; catalog-wide, unique category ids per
  language, unique entry ids across the catalog, an entry's category existing in its own language, unique `order`
  within a category, and published entries only in published categories in `available` levels (when a level is
  declared at all). Invalid vocabulary stops the API from starting, like every other content type.
- **Status is per-student state, not content**, with the same forward-mostly transition rule lessons and exercises
  use elsewhere in spirit: forward is always allowed, one step back (`learned → learning`) is allowed, every other
  step back is refused (`409`), and the only way to reach `new` again is to remove the word.
- **Search** folds Unicode (case, diacritics, a handful of Latin letters normalisation does not decompose) and
  matches as a plain substring — never a database full-text index or an external search engine (ADR-022 §9).
- **Adding vocabulary** is files: a new category, or new entries in an existing one; nothing else changes.

### Polish seed vocabulary (M9)

Six original categories (`greetings`, `numbers`, `family`, `food`, `everyday`, `travel`), about thirty entries in
total. It exists to prove the system; it is **not** a complete A1 vocabulary and does not claim CEFR coverage.
Grammatical gender follows the general Polish ending rule, with the one exception included (`tata`) checked against
a live source rather than assumed; a plural is given only where it was checked. See
[content/languages/pl/vocabulary/README.md](../../content/languages/pl/vocabulary/README.md) and ADR-022's Sources
verified section.

## Phonetics (M10)

Rationale: [ADR-023](../adr/adr-023-phonetics.md). Phonetics follows the same rule as vocabulary, lessons and
exercises: **content is files, a student's own progress on a representation is the only thing in PostgreSQL.**
Independent of Vocabulary — no shared identifier, no data reference between the two contexts.

- **A topic is a file, a representation is one item in it.** `content/languages/<languageId>/phonetics/<topicId>.json`
  holds a `PhoneticTopic` (id, status, order, title, description?, instructionLanguage) and its `items`
  (`PhoneticRepresentation`s). A representation inherits `languageId`, `topicId` and `instructionLanguage` from its
  file — never repeated per representation.
- **What every representation has, and what is optional.** Required: `id`, `ipa`, `description`, `status`, `order`.
  Optional: `topicId` (unlike vocabulary's always-required category — not every sound needs a grouping), `levelId`
  (pedagogical placement, not certification — same rule as lesson/exercise/vocabulary levels), `note`,
  `exampleWords` (`{ word, translation }[]`, free text — never a `VocabularyItemId` reference).
- **IPA is Unicode text**, validated the same bounded-plain-text way every other content string is — no per-symbol
  allowlist, no image, no hard-coded symbol table.
- **Validation** is the same loader as all content: per file, a strict schema; catalog-wide, unique representation
  ids across the catalog, unique topic ids per language, a representation's topic existing in its own language when
  it names one, unique `order` within a topic, and published representations only in published topics (when named)
  in `available` levels (when declared).
- **Progress is per-student state, not content**, and unlike vocabulary's status it only ever moves forward:
  `viewed → practiced → completed`, with no backward step at all (a sound has no honest "I forgot it" correction the
  way a word's memorised meaning does). Recording a view happens automatically when a representation's detail page
  opens (the same "opening starts it" idea lessons use), on every fresh open — not just the first.
- **View, practice and complete are three atomic Postgres primitives** (`INSERT … ON CONFLICT DO UPDATE`), each with
  its own refresh rule: a view always refreshes the last-viewed time without touching status; practice advances from
  `viewed` and always refreshes when it was last practiced, even after completion; complete is the only one that is
  fully idempotent once reached.
- **Browsing and the topics-with-progress view share one query engine** (`queryVisiblePhonetics`), the same pattern
  vocabulary's browse/My Vocabulary share: visibility, language/level/topic filters, deterministic order (topic,
  then representation, ties by id — an untopicked representation sorts last), a cursor page, one batched progress
  lookup per page.
- **API** (authenticated, `private, no-store`): `GET /phonetics` (list, filtered/paged, 120/min), `GET
/phonetics/topics` (topics + progress, 120/min), `GET /phonetics/:id` (detail, 120/min), `POST
/phonetics/:id/view|practice|complete` (60/min, no body). No `:userId` anywhere; an undocumented query key or body
  field is a `400`. No `409` exists — every repeat action either advances or no-ops, never refuses a step.
- **Frontend**: nav link "Phonetics"; `/learn/phonetics` (browse: language picker, topic cards with progress,
  topic/status filters, a card per sound with its IPA, description and practice/complete actions);
  `/learn/phonetics/:phoneticId` (detail: IPA, description, topic, level, note, example words, progress). The IPA
  symbol always carries an explicit `aria-label` for screen readers. The vocabulary detail page links to
  `/learn/phonetics?language=<word's language>` ("View pronunciation guide") — UI-only, no shared data.
- **Content**: a small, original Polish seed set — two topics (`consonants`, `vowels`), eight representations. IPA
  and articulatory descriptions checked against standard academic Polish phonology references (see
  [content/languages/pl/phonetics/README.md](../../content/languages/pl/phonetics/README.md)), not invented. Not a
  claim of phonemic coverage.
- **Not built, on purpose**: audio, speech recognition, pronunciation scoring, search over IPA/description, a reward
  for completing phonetics content, a backward progress correction.

### Polish seed phonetics (M10)

Two topics (`consonants`: six consonant sounds that do not exist, or are easy to mispronounce, in English; `vowels`:
the two nasal vowels), eight representations in total. It exists to prove the system; it is **not** a complete
phonemic inventory of Polish and does not claim CEFR coverage. IPA transcriptions and descriptions were checked
against standard academic references for Polish phonology rather than invented. See
[content/languages/pl/phonetics/README.md](../../content/languages/pl/phonetics/README.md) and ADR-023's Sources
verified section.
