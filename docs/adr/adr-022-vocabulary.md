# ADR-022: Vocabulary — entries as content grouped by category, status as per-student state, search folded on Unicode

Status: ACCEPTED
Date: 2026-09-22 (M9 — Vocabulary)

Builds on [ADR-018](adr-018-content-languages.md) (content is files, `languageId` is data, ids are stable slugs),
[ADR-019](adr-019-lessons.md) (a student's relationship to content is a separate, small table; forward-only,
idempotent transitions applied by atomic repository operations) and [ADR-021](adr-021-gamification.md) (a reward is
never created from vocabulary directly — it goes through a publisher a later milestone can listen to). Reference:
[content-architecture.md](../architecture/content-architecture.md) and the [API docs](../api/README.md).

## Context

M9 needs a vocabulary system that works the same way for Polish, English, Spanish, German, French, Italian or
Portuguese without touching React components, use cases or repositories per language — and a student side (saved,
learning, learned) that is per-student state, not content. Two design questions are specific to vocabulary and have
no M5–M8 precedent:

- **Lemma vs. word form.** Does a vocabulary entry need to model inflected forms (a verb's conjugations, a noun's
  cases) now, or can it stay one lexical unit per entry?
- **Search.** A student typing "czesc" should find "cześć". Plain substring matching on the raw string would not.

And two are the same shape M6/M7 already solved, applied to a new content type: how vocabulary is grouped (category,
not a lesson) and how a student's status on a word is stored and moved between states.

## Decision

### 1. Vocabulary is content; category and entry are separate concepts, one file per category

`VocabularyCategory` (a topic: `greetings`, `food`, …) and `VocabularyItem` (one word or fixed phrase) are both
domain types, read from `content/languages/<languageId>/vocabulary/<categoryId>.json` — the same validated-JSON,
loaded-once-at-startup approach as languages, lessons and exercises (ADR-007/018). One file per category, holding
its own entries: an entry's `languageId`, `categoryId` and `instructionLanguage` are **inherited from the file**, not
repeated per entry, so an entry can never disagree with its own category about them. No `vocabulary` or
`vocabulary_categories` table exists — the same "content is data, not database rows" decision M5–M8 already made,
for the same reason: two sources of truth for the same fact.

### 2. An entry's required fields are minimal; grammar is optional

`VocabularyItem` requires only `id`, `languageId`, `categoryId`, `status`, `order`, `lemma`, `translation` and
`instructionLanguage`. `levelId`, `partOfSpeech`, `gender`, `plural`, `note` and `example` are all optional: a
numeral has no plural, most languages have no grammatical gender, and forcing every field would either invent facts
for languages that do not have the concept or make every future language author pad the schema with placeholders.
`levelId` is the content author's own pedagogical placement — never a claim of CEFR certification (ADR-018 already
established this for lessons; the same rule applies here).

### 3. Lemma vs. word form: not modelled yet, and the shape does not block it

M9 does not build a morphology system. An entry names one lexical unit by its dictionary form (`lemma`); the one
inflection fact given room now is `plural`, because it is the first form a beginner meets and needlessly common in
practice sentences. Everything else (verb conjugations, noun cases, comparative/superlative adjective forms) is left
out. This is deliberate, not an oversight: `VocabularyItemId` identifies the lemma, a student's saved/learned status
is keyed on that same id, and a future `forms` list on the entry (or a separate table keyed by the entry's id) can be
added without touching the id, the per-student table or any existing entry. Building a word-form engine now would be
speculative complexity for a feature nothing in M9 needs.

### 4. Ids are stable slugs, language-prefixed like every other content id — never derived from the lemma

`VocabularyItemId` reuses `ContentId`'s exact rules (`isValidContentId`): lowercase ASCII slug, language-prefixed,
permanent. It is **not** derived from the lemma — a lemma may carry diacritics (`cześć`), be a multi-word phrase
(`dzień dobry`), or collide in spelling with an unrelated word in another category — so an author picks the slug and
it never changes even if the lemma's spelling is corrected. `VocabularyCategoryId` uses the same slug shape but is
**not** language-prefixed: a category is a shared topic name (`food` means "the food words" in every language that
has one), scoped by the language of the file that declares it, matching how M5 already lets several languages reuse
the same level ids.

### 5. Cross-file catalog rules mirror M7's exercise rules exactly

`validateVocabulary` (domain) checks what no single file can see: unique category ids per language, unique entry ids
across the whole catalog, an entry's category existing in the entry's own language, ordering, and availability — a
_published_ entry lives only in a level that is `available` (when it declares one at all) and only in a _published_
category, and a published category always has at least one published entry. Every rule already existed for content
or exercises (ADR-018 §validation, ADR-020 §9); this section only applies the same standard to vocabulary.

### 6. `UserVocabularyEntry` is the only stored fact about a student and a word

One table, `user_vocabulary` (PK `user_id, vocabulary_item_id`, FK cascade to `users`), the same shape as
`lesson_progress` (ADR-019): "not stored" _is_ the `new` status, so there is no row for a word a student has never
touched. Status is `saved | learning | learned`; `learned_at` is set if and only if the status is `learned`
(mirroring `lesson_progress`'s completion-consistency CHECK). No `lastReviewedAt`, `nextReviewAt`, `reviewCount`,
`difficulty` or `retention` field exists — those belong to spaced repetition (explicitly out of scope, brief §34) and
would be dead weight today; adding them later is adding columns to this table, not redesigning it.

### 7. The allowed status transitions are one small, explicit table — not a general state machine

Forward is always allowed, including skipping a step (a student who already knows a word can save it straight to
`learned`). Exactly one step back is allowed: `learned → learning` ("I forgot it" — an honest, common correction).
Every other backward step is refused; to start over a student removes the word (`unsave`) and saves it again. This
is `ALLOWED_STATUS_CHANGES`, a plain list of `[from, to]` pairs in the domain — not a general graph or a workflow
library, per the brief's own instruction to avoid an unnecessary state machine (§15). The **same list** is what the
Postgres adapter's `CASE` expression is built from (`ALLOWED_TRANSITION_SQL`, generated directly from the array), so
the rule cannot drift between the in-memory fake, the SQL and the domain's own tests.

### 8. Save, unsave, mark-learned and set-status are four operations built on two atomic primitives

`save` never regresses a word — a save on an already-learned word is a no-op, proved by an atomic
`INSERT … ON CONFLICT DO UPDATE` that only refreshes `updated_at`. `changeStatus` is the same idiom with a `CASE`
per column that applies the target only when `ALLOWED_TRANSITION_SQL` allows it, otherwise keeps the row exactly as
it was — proved with two concurrent writers landing on exactly one row in a legal state (packages/data). `unsave`
deletes the row (idempotent) and is the **only** way back to `new`. `mark as learned` always targets `learned`
(never refused, since every status may move there) and reads the prior status once, before writing, purely to decide
whether to publish a "just became learned" event — a decision, not a correctness dependency, since the write itself
stays atomic and race-safe regardless. `update status` is the general form; a step it refuses answers `409`, not a
silent no-op, so the client can tell "nothing happened because you asked for nothing new" apart from "that step is
not allowed".

### 9. Search is a folded substring match, not full-text search or an external engine

`foldForSearch` lower-cases, Unicode-normalises (NFD), strips combining marks, and folds the small set of Latin
letters normalisation does not decompose (ł, đ, ø, ß, æ, œ, ı) to what a learner without the right keyboard would
type. `matchesVocabularySearch` then does a plain substring test per field (lemma, translation, plural) with the
folded term — never a regex or SQL pattern built from user input, so `.*`/`%` are literal characters to search for,
not wildcards. This runs in memory over the (small, file-backed) catalog, the same way M5–M7 filter and sort their
content: PostgreSQL full-text search or an external engine (Elasticsearch) would be solving a problem this dataset's
size does not have (brief §22 — "no optimices prematuramente").

### 10. Listing and pagination: filtered/sorted in memory, paged with an id cursor, DB-shaped for later growth

`queryVisibleVocabulary` (one function, shared by "browse" and "My Vocabulary") applies visibility, the
language/level/category/search filters and a deterministic sort (category order, then entry order, ties by id), then
slices by a cursor (`after`, the last id of the previous page — if not found in the current result, the page starts
from the beginning rather than erroring, since content can change between two requests). This mirrors the response
shape gamification's points history already uses (`items/total/nextAfter` vs. `transactions/nextBefore`), so a
future DB-backed keyset implementation (if the vocabulary dataset ever stopped being a small file tree) would not
need a contract change — only the adapter behind `VocabularyRepository` would.

### 11. "My Vocabulary" is the same engine with one extra filter, not a parallel implementation

`ListUserVocabularyUseCase` calls the exact same `queryVisibleVocabulary` as `ListVocabularyUseCase`, adding only
"the entry must have a record" (and restricting `status` to the stored three, since `new` is not a state a student's
own list can contain — a word has no record simply because it was not put there). Visibility, filters, sorting and
the cursor cannot drift between the two views because there is only one implementation of them.

### 12. Vocabulary never calls gamification directly; a `VocabularyEventPublisher` is the seam

No new `RewardReason`, no call to `AwardRewardsUseCase`, from anywhere in M9 — the brief is explicit that M9 must not
invent point rules on its own (§18). `MarkVocabularyItemLearnedUseCase` publishes a `VocabularyItemLearnedEvent`
(domain shape, in-process, no broker — the same "shape a broker would publish, no broker" approach ADR-021 used for
its own events) exactly once per word becoming learned, through a `VocabularyEventPublisher` port. M9 wires a
no-op implementation (`NoopVocabularyEventPublisher`). A later milestone can reward a learned word by writing a real
listener and changing composition only — `VocabularyService → GamificationDatabaseDirectly` never happens, matching
the brief's explicit instruction (§54).

### 13. Ownership and input handling follow the established pattern exactly

Every vocabulary route is authenticated; the student is always `request.currentUser.id`, never a body/query/URL
value. Action routes (`save`, `unsave`, `learned`) take a strict, empty body — any key is a `400`, not silently
ignored (the same rule as lesson `start`/`complete`, ADR-019). The status-update body accepts exactly one field,
`status`, restricted to the three stored values (`new` is unreachable by this route on purpose — it is reached only
by removing the word). List query parameters are a `.strictObject()`: an undocumented key, most pointedly `userId`,
is a `400`. IDOR is structurally impossible, not merely checked: no route has a place to put another student's id.

### 14. Page routes are under `/learn/vocabulary`, not `/vocabulary`

Same reasoning as lessons and exercises (ADR-019 §, ADR-020 §8): `/vocabulary` and `/user-vocabulary` are the API
paths, so a page at that path would need the fragile `/profile`-style dev-proxy bypass (ADR-017). `/learn/vocabulary`
(browse), `/learn/vocabulary/mine` (My Vocabulary — a static segment, so React Router ranks it above
`/learn/vocabulary/:vocabularyId` regardless of registration order, the same technique `/learn/lessons` already
relies on) and `/learn/vocabulary/:vocabularyId` need no such bypass.

### 15. Content: a small, original Polish seed set, with grammar facts sourced or omitted

Six categories (`greetings`, `numbers`, `family`, `food`, `everyday`, `travel`), about thirty entries — a
demonstration of the system, explicitly not a claim of A1 coverage (the same stance M5 took for lessons). Every
translation and note is original wording. Grammatical gender for a regular noun follows the general, well-documented
Polish rule (consonant ending → masculine, `-a` → feminine, `-o`/`-e` → neuter); the one exception included, `tata`
(masculine despite ending in `-a`, because Polish keeps masculine gender for nouns naming a male person regardless of
ending) was checked against a live source before being written down, not assumed — see Sources verified. A plural is
given only for the handful of nouns whose plural was checked (`dom → domy`, `kot → koty`, `pies → psy`); every other
entry simply omits `plural` rather than assert an unverified irregular form.

## Options considered

- **A `vocabulary`/`vocabulary_categories` table, seeded from data or authored directly in Postgres.** Rejected —
  same reasoning as content, lessons and exercises (§1): two sources of truth for the same fact, and the brief's own
  "possible tables" list was explicitly non-binding (as it was for M5–M8).
- **A full morphology/word-form system now (lemma + forms table, inflection rules).** Rejected as speculative
  complexity M9 does not need (§3); the id and storage shape leave room for it.
- **Derive `VocabularyItemId` from the lemma (slugify it).** Rejected: a lemma with diacritics or a multi-word phrase
  does not slugify losslessly or uniquely, and identity would then depend on spelling — a corrected typo in the
  lemma would silently change a word's id and orphan every student's saved record for it.
- **A single generic state-machine library/graph for status transitions.** Rejected per the brief (§15); four
  explicit pairs plus "forward is fine" covers the real requirement without new machinery.
- **PostgreSQL full-text search (`tsvector`) or an external search engine for the vocabulary list.** Rejected as
  premature for a file-backed dataset of a few dozen entries (§9); the folded-substring approach is exact for what a
  beginner actually types and needs no index.
- **`unsave` as "set status back to `saved`" instead of deleting the record.** Rejected: it would not answer "how do
  I get back to `new`", and it would keep a row (and its `created_at`) for a word the student explicitly took off
  their list.
- **`updateVocabularyStatus` silently coercing a refused transition to a no-op 200.** Rejected: a student (or a bug)
  asking for `learning → saved` deserves to know the request did not do what it asked, not a misleadingly successful
  response with an unexpected result.
- **Reward vocabulary directly from `MarkVocabularyItemLearnedUseCase` (a new `RewardReason`, calling
  `AwardRewardsUseCase`).** Rejected — the brief explicitly forbids inventing a reward rule in M9 without an agreed
  design (§18); the event publisher exists so this can be added later without coupling the two contexts.
- **Pages at `/vocabulary`, `/vocabulary/mine`, with a `/profile`-style dev-proxy bypass.** Rejected (§14) — every
  other milestone since M6 solved this by choosing a non-colliding page path instead, and there is no reason
  vocabulary needs the one exception `/profile` still carries.

## Consequences

- **Adding a language's or a category's vocabulary is files** (`content/languages/<code>/vocabulary/*.json`); no
  domain, application, API or component code changes, proved the same way M5–M8 prove it (a fictional-language
  catalog in the application-layer tests).
- **No word-form/morphology system exists.** A word's inflected forms beyond `plural` are not modelled; a future
  milestone can add a `forms` list to an entry or a keyed-by-entry-id table without touching ids, the per-student
  table or existing content.
- **Search is exact-substring on folded text**, not fuzzy and not full-text ranked. It will not find a misspelled
  query; that is out of scope, matching the brief's explicit "no Elasticsearch, no premature optimisation" (§22).
- **Listing and pagination are in-memory**, sized for a content-file-bounded dataset like the rest of the catalog —
  not for a table that grows without bound the way `point_transactions` does. If vocabulary content ever became
  large enough that this stopped being appropriate, only the `VocabularyRepository`/`queryVisibleVocabulary`
  implementation would need to change; the API/contract shapes already support a real keyset cursor.
- **A reward for a learned word does not exist yet.** The event is published and discarded (`NoopVocabularyEventPublisher`);
  nothing in M9 grants points for vocabulary, per the brief.
- **`mark as learned`'s "was it already learned" read is not itself what keeps the write race-free** — the atomic
  `changeStatus` upsert is — so a race there can, at worst, publish the learned event redundantly in a vanishingly
  rare interleaving; it can never corrupt the stored status or double-count anything a future reward would need to
  guard against (a reward listener would still need its own idempotency key, exactly as gamification's reward
  identity already requires).
- **`user_vocabulary` rows outlive an entry** that is later archived or removed from content: they are simply not
  listed, and are cleaned up only by user deletion (cascade) — the same limitation ADR-020 documents for
  `exercise_attempts`.
- Vocabulary content (lemma, translation, grammar) is reachable only through the authenticated API, like exercise
  content and unlike lesson bodies (ADR-019's public-`GET /content/:id` limitation does not apply here, since
  vocabulary was never exposed through the M5 content endpoints).
- A sixth `pg` pool per API process now exists (identity, profile, lessons, exercises, gamification, vocabulary); a
  real Neon connection was never exercised (Docker Postgres in dev, PGlite in tests).

## Sources verified

- Polish noun gender's general rule (consonant ending → masculine, `-a` → feminine, `-o`/`-e` → neuter) and the
  masculine-despite-`-a` exception for nouns naming a male person (`tata`, `poeta`, `sędzia`) — checked via web
  search (Wikibooks "Polish/More on nouns - genders", 5-Minute Language, LingQ's Polish grammar guide) on
  2026-09-22, not assumed.
- The three included plurals (`dom → domy`, `kot → koty`, `pies → psy`) — checked via web search (Preply "Polish
  nouns", Settemila Lingue plural-formation reference) on 2026-09-22. No other entry's plural is asserted.
- No CEFR "can do" descriptor or official word list was consulted or claimed; `levelId` on an entry is the same
  "pedagogical metadata, not certification" position ADR-018 already took and verified.
