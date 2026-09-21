# ADR-018: Languages, CEFR levels and content as validated data

Status: ACCEPTED
Date: 2026-09-20 (M5 — Content & Languages)

Refines [ADR-007](adr-007-content-architecture.md) (which fixed the principle: content is data, behind
a `ContentRepository`) with the concrete model, format, storage and API. Detail for authors:
[content-architecture.md](../architecture/content-architecture.md).

## Context

The platform starts with Polish at A1 and must grow to more languages and CEFR levels **by adding
data**, not code: no per-language pages, controllers, use cases or repositories, and no Polish text in
React or in application services. M5 has to fix the language/level model, where content lives, how
it is validated, how it is exposed, and what the student-facing UI needs — without building the lesson
experience (M6).

## Decision

### 1. Storage: canonical version-controlled files, read through the existing port

`content/languages/<languageId>/language.json` and
`content/languages/<languageId>/levels/<levelId>/content/<contentId>.json` are the **single source of
truth** for languages, level availability and educational content. `apps/api` reads and validates the
whole tree at startup through a filesystem `ContentRepository` adapter (`packages/data`) and serves it
from memory. **M5 adds no database tables and no migrations.** There is no copy of the content in
PostgreSQL, in React, or anywhere else, so there is nothing to synchronise.

### 2. The model

| Concept           | Where                                       | Identity                                                                             |
| ----------------- | ------------------------------------------- | ------------------------------------------------------------------------------------ |
| **Language**      | `language.json`                             | its ISO 639 code (`pl`) — the code _is_ the id; no surrogate id until a DB needs one |
| **Level**         | `CEFR_LEVELS` constant in `packages/domain` | stable lowercase id `a1`…`c2`; `label` (`A1`) is display only; `rank` orders         |
| **LanguageLevel** | `levels[]` inside `language.json`           | (`languageId`, `levelId`) + `status: available \| planned`                           |
| **ContentItem**   | one JSON file per item                      | `contentId` (`pl-greetings`): globally unique, namespaced by language                |

- **Language** carries `name`, `nativeName`, `locale` (BCP 47, e.g. `pl-PL`, distinct from the
  language so regional variants can be added later), `direction` (`ltr`/`rtl`) and `isActive` (catalog
  on/off switch). The UI takes `dir`/`lang` from this metadata.
- **Levels are code, availability is data.** CEFR is a fixed, language-independent, six-level
  standard, so `LevelId` is a closed union and the catalog is a constant (as the avatar catalog was in
  ADR-017); which levels a language _offers_, and their status, is per-language data. `available`
  means the level has published content and is selectable; `planned` means "coming soon" — visible,
  never selectable, no content served. A level a language does not list is simply not offered.
- **ContentItem** has `type` (`lesson` | `explanation`, the minimum M5 needs), `status`
  (`draft`/`published`/`archived`), explicit `order`, `title`, `description`, `instructionLanguage` and
  `blocks`. Blocks are structured data: `explanation` (text), `example` (text, translation, optional
  note) and `dialogue` (lines of speaker/text/translation). Every string is plain text — no HTML, no
  markup, no executable content.
- **Learning language vs interface language** are separate concepts in the data:
  `languageId` is what is being learned, `instructionLanguage` is what the explanations and
  translations are written in (`en` for all M5 content). The UI is still English-only; nothing else
  about interface localisation is implemented.

### 3. Validation: one system, three layers

Zod in `packages/contracts` (already the shared schema technology) defines the strict on-disk format
_and_ the API shapes, built from the domain's own predicates so they cannot drift.

1. **Per file** — schema: required fields, known enums, bounded lengths, plain-text-only strings (no
   control characters, no markup), known block types only, `.strict()` objects.
2. **File vs location** — the file's `languageId`/`levelId`/`code` must match its folder, and its name
   must be `<id>.json`.
3. **Catalog-wide** (`validateContentCatalog`, pure domain) — unique ids, unknown language/level,
   language-namespaced ids, unique `order` per language+level, published content only in `available`
   levels, and every `available` level having published content (availability may not be a lie).

The same loader runs (a) at API startup — malformed content **stops the server from starting** — (b) in
`pnpm content:validate`, a Jenkins stage that reports every problem at once, and (c) in Vitest, which
asserts the shipped Polish data.

### 4. Visibility rules live in application use cases

The repository port is storage only. `ListLanguages`, `ListLanguageLevels`, `ListContent` and
`GetContent` enforce: active languages only, `available` levels only, `published` content only,
explicit ordering (`order`, then `id`). Every "you may not see this" outcome for content is the same
`404`, so unpublished content cannot be probed.

### 5. API and access policy: public, read-only

`GET /languages`, `GET /languages/:languageCode/levels`, `GET /content?language=&level=`,
`GET /content/:contentId`. **No authentication**: this is catalog metadata and openly published
educational content, not personal data, and browsing what can be learned should not need an account.
Enforced protections instead: strict param/query schemas (`400`), allowlisting response schemas (no
`status`, `isActive`, paths), published-only, generic `404`/`500` bodies that never echo input, per-route
rate limits (120/min per client), and no request value ever forms a file path (ids are looked up in
memory). If a later milestone gates content bodies (subscriptions), that is a deliberate change to
these routes.

### 6. Frontend

Generic, catalog-driven pages under `/learn` (`/learn`, `/learn/:languageCode`,
`/learn/:languageCode/:levelId`, plus a read-only content view). The choice lives in the URL. The pages
are deliberately **not** under `/languages` or `/content`: those are the API paths, and a page and an
API sharing a path needed the proxy workaround recorded in ADR-017. Reusable `LanguageSelector`,
`LevelSelector`, `ContentList` and `ContentBlocks` render only what the catalog gives them; block types
map to fixed components, and an unknown type renders a neutral notice. Server state uses the existing
TanStack Query cache (`["catalog", …]`, ten-minute stale time, kept across logout because it is not
user data). No second cache, no Redis.

### 7. What the student "has selected" is not stored in M5

The boundary: **catalog** (which languages/levels/content exist) → **availability** (which are
selectable) → **the student's learning selection** → **progress**. M5 implements the first two. The
current choice is expressed by the URL only; persisting an enrolment ("I am learning Polish A1") needs
a table keyed to the user and is coupled to progress, so it was expected in M6. (M6 did not need it: the choice is in the URL — see [ADR-019](adr-019-lessons.md) §8; it is still unassigned.) No profile field was added.

### 8. Versioning and lifecycle

Each file carries `schemaVersion: 1` (the _format_ version; an incompatible change bumps it and fails
old files loudly). The _revision history_ of the content is Git. There are no `createdAt`/`updatedAt`
fields: hand-maintained timestamps drift, and Git already records who changed what and when. A future
database-backed store would add revision columns then.

## Options considered

- **PostgreSQL tables for languages, levels, language_levels and content, seeded from files.**
  Rejected for M5: it creates a second copy of the data that must be kept in sync (migrations vs
  files vs API), needs seed/upsert machinery and a running database for every content edit or test,
  and buys nothing yet — no user data references content, and no CMS edits it at runtime. The
  `ContentRepository` port keeps this open (below).
- **Metadata in PostgreSQL, content in files (the brief's suggested hybrid).** Rejected: two sources of
  truth for one concept, with the availability rules (`available` needs published content) split
  across a database and the file tree, where they can no longer be checked in one pass.
- **JSON imported into the bundle (`import pl from "…/pl.json"`).** Rejected: adding a language would
  need an import line in code, and Polish content would ship in the initial JS bundle.
- **YAML or TypeScript data files.** JSON needs no new dependency, is strictly parseable, diffs well,
  and cannot contain executable code; TypeScript content would be code.
- **Levels as data (`levels.json`).** Rejected: `LevelId` would stop being a closed union, and CEFR is
  a fixed standard, not per-deployment configuration.
- **Per-language repositories, controllers, use cases or pages.** Rejected outright — it is exactly the
  duplication this milestone exists to prevent. `no-language-branching.test.ts` enforces it.
- **Authenticated-only discovery.** Rejected for now, see §5.

## Consequences

- **Adding a language** is data only: `content/languages/<code>/language.json` (declare levels and
  status), content files under `levels/<id>/content/`, then `pnpm content:validate`. No code changes;
  this is proved by tests at the application, storage and HTTP layers using fictional languages.
- **Content is read once at startup.** Editing content needs a new release (or an API restart); there
  is no hot reload. A deployment that keeps `content/` elsewhere sets `CONTENT_DIR`; shipping the
  `content/` folder alongside the API is now a deployment requirement (ADR-015 is still PENDING).
- **No database is involved in M5.** So there are no migrations, no seeds and no Docker/Neon
  dependency, and the "Docker PostgreSQL integration tests" of the milestone brief have nothing to
  cover. Repository tests run against the real file system (temporary directories), which is the real
  adapter. Moving to a database later means writing a second adapter for the same port and a one-way
  import from these files; the file schema is already self-describing (files carry their own
  `languageId`/`levelId`), so no path parsing is needed.
- **The first triggers to move content into PostgreSQL** are: content edited by non-developers at
  runtime (a CMS), per-user rows that need a foreign key to content (M6 progress can reference
  `contentId` as validated text until then), or content volume that makes start-up loading slow.
- **Content ids are permanent.** Renaming one breaks any future reference to it; retire an item by
  setting `status: archived`.
- **A language's ids are prefixed with its code**, so a content id is unique across the platform without
  a registry, at the cost of changing the id if a language's code ever changed (it will not: it is an
  ISO code).
- Public endpoints are rate-limited but unauthenticated: they must never return anything that is not
  fine for anyone to read.
- Instruction-language variants of the same lesson (e.g. Polish A1 taught in Spanish) are not modelled
  beyond the `instructionLanguage` field; a second variant would need its own ids or a translations
  map — a decision deferred until it is real.

## Sources verified (2026-09-20)

Verified through web search results; the Council of Europe and Library of Congress pages themselves
returned `403` to direct fetches from this environment, so these were confirmed from search-result
summaries of those pages rather than read in full.

- **CEFR**: six levels A1, A2, B1, B2, C1, C2, commonly grouped as Basic (A), Independent (B) and
  Proficient (C) user; the Council of Europe's 2020 Companion Volume is the current reference. The
  app uses the six level names as an organising scale only. It reproduces **no** CEFR descriptors,
  makes **no** claim that its content is CEFR-certified or aligned to any descriptor, and states that
  the seed content is not a complete course.
- **ISO 639-1 codes**: `pl` Polish, `en` English, `es` Spanish, `de` German, `fr` French, `it`
  Italian, `pt` Portuguese. `LanguageId` accepts two- or three-letter lowercase codes (ISO 639-1
  preferred; 639-2 for a language without a two-letter code) and does not check against the registry.
- **Polish facts in the seed content** (ł as English w; ó and u identical; sz and cz as digraphs; no
  articles; greeting and introduction phrases) were cross-checked against several reference sources
  including Wikipedia's "Polish orthography" and language-teaching references. They are the app's own
  original wording, are marked approximate where they compare sounds to English, and are not an
  academic authority. No third-party text was copied.

## References

- [content-architecture.md](../architecture/content-architecture.md), [ADR-007](adr-007-content-architecture.md)
- [ADR-005](adr-005-database.md) (database), [ADR-017](adr-017-student-profile.md) (page vs API paths, catalog precedent)
- [api README](../api/README.md), [security-baseline.md](../security/security-baseline.md)
