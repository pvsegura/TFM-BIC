# ADR-023: Phonetics — representations as content optionally grouped by topic, progress as forward-only per-student state, independent of Vocabulary

Status: ACCEPTED
Date: 2026-09-23 (M10 — Phonetics)

Builds on [ADR-018](adr-018-content-languages.md) (content is files, `languageId` is data, ids are stable slugs),
[ADR-019](adr-019-lessons.md) (a student's relationship to content is a separate, small table; forward-only,
idempotent transitions applied by atomic repository operations) and [ADR-022](adr-022-vocabulary.md) (the
category/entry file-per-topic shape, the visibility rule, ownership and input-handling pattern this milestone
reuses almost unchanged). Reference: [content-architecture.md](../architecture/content-architecture.md) and the
[API docs](../api/README.md).

## Context

M10 needs a phonetics system that works the same way for Polish, English, Spanish, German, French, Italian or
Portuguese without touching React components, use cases or repositories per language — and a student side (viewed,
practiced, completed) that is per-student state, not content. Three design questions are specific to phonetics and
have no M5–M9 precedent:

- **Does a representation need a topic at all?** Vocabulary's `categoryId` is required on every entry. A phonetic
  sound is not always naturally grouped, and forcing a topic on every representation would either invent artificial
  groupings or block a language's first, ungrouped seed content.
- **Do sounds/words need to move backward, the way a word can go `learned → learning`?** Vocabulary models "I forgot
  it" as a legitimate backward step. Does a phonetic sound need the same?
- **How does Phonetics relate to Vocabulary** — the milestone this one most resembles — without duplicating a
  word's lemma/translation/language or coupling the two contexts' data models together?

Everything else — how a topic groups content, how a student's progress is stored and moved between states, ownership,
input handling — is the same shape M9 already solved, applied to a new content type.

## Decision

### 1. Phonetics is content; topic and representation are separate concepts, one file per topic

`PhoneticTopic` (a grouping: `consonants`, `vowels`, …) and `PhoneticRepresentation` (one sound, transcription or
pronunciation note) are both domain types, read from
`content/languages/<languageId>/phonetics/<topicId>.json` — the same validated-JSON, loaded-once-at-startup approach
as languages, lessons, exercises and vocabulary (ADR-007/018/022). One file per topic, holding its own
representations: a representation's `languageId`, `topicId` and `instructionLanguage` are **inherited from the
file**, not repeated per representation. No `phonetic_representations`/`phonetic_topics` table exists — the same
"content is data, not database rows" decision M5–M9 already made, for the same reason: two sources of truth for the
same fact.

### 2. A representation's topic is optional, unlike vocabulary's category

`PhoneticRepresentation` requires only `id`, `languageId`, `status`, `order`, `ipa`, `description` and
`instructionLanguage`. `topicId`, `levelId`, `note` and `exampleWords` are all optional. Unlike a vocabulary entry —
which always belongs to exactly one category, because the file format itself is a category file — a phonetic
representation may be authored with no grouping at all: not every language's first phonetics content needs a topic
taxonomy decided up front, and forcing one would either invent an artificial "general" bucket or block content from
shipping until a taxonomy exists. `findVisiblePhoneticRepresentation`, `queryVisiblePhonetics` and
`ListPhoneticTopicsUseCase` all treat "no topic" as a valid, first-class case (skip the topic visibility check;
sort after every topic's own representations; excluded from any one topic's tally but included in the language-wide
one).

### 3. Ids are stable slugs, language-prefixed like every other content id — never derived from the IPA

`PhoneticRepresentationId` reuses `ContentId`'s exact rules (`isValidContentId`): lowercase ASCII slug,
language-prefixed, permanent — the same reasoning as `VocabularyItemId` (ADR-022 §4). It is **not** derived from the
IPA transcription itself, which is Unicode text that may contain characters unsafe in an id (combining marks,
tie bars). `PhoneticTopicId` uses the same slug shape but is **not** language-prefixed, matching
`VocabularyCategoryId`: a topic is a shared grouping name (`consonants` means "the consonant sounds" in every
language that has one), scoped by the language of the file that declares it.

### 4. Cross-file catalog rules mirror M9's vocabulary rules, adapted for the optional topic

`validatePhonetics` (domain) checks what no single file can see: unique representation ids across the whole catalog,
unique topic ids per language, a representation's topic existing in the representation's own language **when it
names one**, ordering (unique per topic, or ignored entirely for an untopicked representation), and availability —
a _published_ representation lives only in a level that is `available` (when it declares one) and, when it names a
topic, only in a _published_ topic; a published topic always has at least one published representation. Every rule
already existed for vocabulary (ADR-022 §5); this section only adds the "topic is optional" exception throughout.

### 5. `UserPhoneticProgress` is the only stored fact about a student and a representation — and it never moves backward

One table, `user_phonetic_progress` (PK `user_id, phonetic_representation_id`, FK cascade to `users`), the same
shape as `user_vocabulary` (ADR-022 §6): "not stored" _is_ the `not_started` status, so there is no row for a
representation a student has never opened. Unlike vocabulary's `saved/learning/learned` — where "I forgot it"
(`learned → learning`) is a legitimate, common correction — a sound or a pronunciation rule does not have an
equivalent honest backward step: practicing or completing a sound again does not mean the student has "forgotten"
it the way a word can slip from memory. `viewed → practiced → completed` therefore only ever advances; there is no
`ALLOWED_STATUS_CHANGES` table to encode, because there is nothing to refuse — every repeat action either advances
the status or leaves it exactly as it is (a no-op on the status, though timestamps still refresh; see §6).
`completed_at` is set if and only if the status is `completed`, mirroring `user_vocabulary`'s and
`lesson_progress`'s completion-consistency CHECK.

### 6. View, practice and complete are three operations built on the same atomic-upsert idiom, but each has different refresh semantics

All three are `INSERT … ON CONFLICT DO UPDATE`, never a separate read-then-write, proved with two concurrent writers
landing on exactly one row in a legal state (packages/data). They differ in what they refresh on a repeat call,
which is itself part of the domain rule (`recordPhoneticView`/`recordPhoneticPractice`/`completePhonetic`, plain
functions in `packages/domain`, mirrored exactly in the SQL `CASE` expressions):

- **`recordView`** never changes the status or any other timestamp — only `last_viewed_at` always advances, on every
  call, whatever the current status. A view is purely "the student looked at this again."
- **`recordPractice`** advances `viewed → practiced`, never regresses a `completed` representation, but **always**
  refreshes `practiced_at` and `last_viewed_at`, even past completion — so repeated practice after completing a
  sound stays visible, unlike vocabulary where nothing tracks "practiced again after learned."
- **`complete`** is the only one that is fully idempotent once reached: an already-`completed` row is left exactly
  as it is, not even its `completed_at` refreshed — the same idiom `completeLesson` (ADR-019) and `changeStatus`
  landing on `learned` already established.

### 7. Recording a view is automatic on open, unlike every vocabulary or lesson action

Opening a representation's detail page records a view immediately (`useRecordPhoneticViewOnOpen`), the same "opening
starts it" pattern `useStartLessonOnOpen` established for lessons (ADR-019) — except a lesson's start is recorded
only once ("not started" is the one trigger condition), while a phonetics view is recorded on every fresh open of a
representation's id (never regressing its status; §6), because "the student looked at this sound" is true every
time, not just the first. This introduced a real race the M9 pattern never needed to consider: the automatic view
request can still be in flight when the student clicks "Practice" or "Mark as completed" moments later, and if its
response arrives after the action's, a naive cache write would overwrite the further-along status with the view's
now-stale one. This is guarded against at the query-cache layer (each action's own successful response is written
directly into the cached detail) and covered by a dedicated regression test
(`phonetic-detail-page.test.tsx`, "does not let a slow, automatic view response overwrite a faster practice/complete
result") — a class of bug unit tests with mocked, synchronously-resolving fetches cannot expose on their own; it
surfaced only once through Playwright driving the real dev server (see §12).

### 8. No search field in M10

Unlike vocabulary's folded-substring search (ADR-022 §9), M10's listing has no free-text `q` filter. A phonetic
representation's searchable surface — its IPA transcription — is not something a learner without IPA training can
usefully type, and the initial dataset is small enough (single digits per topic) that topic/level/status filtering
is sufficient. A future milestone can add search over `description`/`exampleWords` the same way vocabulary added it,
without a model change.

### 9. Listing and pagination: filtered/sorted in memory, paged with an id cursor, ordered by topic then representation

`queryVisiblePhonetics` (one function, shared by every list caller, mirroring `queryVisibleVocabulary`, ADR-022
§10-11) applies visibility, the language/level/topic filters and a deterministic sort (topic order, then
representation order, ties by id — a representation naming no topic sorts after every topic's own, using
`Number.POSITIVE_INFINITY` as its effective topic order), then slices by a cursor (`after`, the last id of the
previous page). This mirrors the exact shape vocabulary's listing already uses, so a future DB-backed keyset
implementation would not need a contract change.

### 10. Ownership and input handling follow the established pattern exactly

Every phonetics route is authenticated; the student is always `request.currentUser.id`, never a body/query/URL
value. Action routes (`view`, `practice`, `complete`) take a strict, empty body — any key is a `400`, not silently
ignored (the same rule as vocabulary's `save`/`unsave`/`learned`, ADR-022 §13). List query parameters are a
`.strictObject()`: an undocumented key, most pointedly `userId`, is a `400`. IDOR is structurally impossible, not
merely checked: no route has a place to put another student's id. Unlike vocabulary's `PUT .../status`, there is no
route that lets a client choose an arbitrary target status directly — each action is its own endpoint with its own
fixed, forward-only meaning — so there is no `409` to map (`mapPhoneticsError` has strictly fewer cases than
`mapVocabularyError`).

### 11. Page routes are under `/learn/phonetics`, not `/phonetics`

Same reasoning as lessons, exercises and vocabulary (ADR-019/020/022 §14): `/phonetics` is the API path, so a page
at that path would need the fragile `/profile`-style dev-proxy bypass (ADR-017). `/learn/phonetics` (browse) and
`/learn/phonetics/:phoneticId` need no such bypass.

### 12. Independent of Vocabulary: no shared identifier, no data reference — the link is UI-only

`PhoneticExampleWord` (`{ word, translation }`) is free text, never a `VocabularyItemId` reference, and
`PhoneticRepresentation` names no vocabulary entry. The two contexts share no foreign key, no join, no lookup: a
representation's example words and a vocabulary entry's lemma can happen to be the same string without either
context knowing about the other. The only integration is a UI link on the vocabulary detail page ("View
pronunciation guide", to `/learn/phonetics?language=<the word's own language>` — the topic/representation browser
for that language, not a specific sound), added after M9 was verified complete and reviewed against three concrete
options (a shared id, a text-matched link, no link at all) — the no-shared-data option was chosen deliberately to
keep the contexts decoupled, at the cost of not deep-linking to the exact sound a word uses. A future milestone
could add that precision (e.g. an optional `relatedVocabularyItemId` on an example word) without changing either
context's existing shape.

### 13. IPA is Unicode text, never a hard-coded symbol table or an image

Every IPA field (file schema, response schema, domain type) is a plain bounded string, validated the same way
every other content string is (`plainText`, ADR-018): non-empty, bounded, no control characters, no markup —
nothing more restrictive, so the full range of Unicode phonetic symbols and diacritics (`ʂ`, `ɕ`, `ɲ`, `t͡ʂ`, `ɔ̃`,
combining tie bars and nasal hooks) is accepted without a per-symbol allowlist. The API, the database column and the
frontend all carry it as UTF-8 text through the same path every other content string takes; no image, no per-symbol
component, no hard-coded lookup exists anywhere in the stack. The IPA symbol on a card or detail page carries an
explicit `aria-label` ("IPA symbol …") so a screen reader announces it as a sound rather than reading unreadable
glyphs character by character.

### 14. `instructionLanguage` remains file-level content data, not a fixed constant

As in every M5–M9 content type, `instructionLanguage` is declared per file, inherited by every representation in it
— never hard-coded in a schema default or in application code. The shipped Polish seed content happens to use `en`
throughout, matching the interface-language decision already in force for the whole product (current-state.md); this
is today's content choice, not an architectural constraint, exactly as ADR-018 already established for lessons.

### 15. No gamification coupling — the brief's own instruction, echoed from ADR-021 and ADR-022 §12

M10 does not call `AwardRewardsUseCase`, does not add a `RewardReason`, and publishes no event at all (unlike
vocabulary's `VocabularyItemLearnedEvent`/`VocabularyEventPublisher` seam) — completing a phonetics topic earns
nothing yet, and no listener or publisher scaffolding was added speculatively for a reward rule that does not exist.
If a future milestone wants "complete a phonetics topic → points", it is a new listener wired at the composition
root, the same decoupled pattern ADR-021/ADR-022 already established — never a direct database write from
`packages/application/phonetics` into gamification's tables.

### 16. Content: a small, original Polish seed set, sourced from standard phonology references, not invented

Eight representations in two topics (`consonants`: six sounds that do not exist or are easy to mispronounce in
English; `vowels`: the two nasal vowels) — a demonstration of the system, explicitly not a claim of phonemic
coverage (the same stance M5/M9 took for lessons and vocabulary). Every description and example word is original
wording; the IPA transcriptions and articulatory descriptions were checked against standard academic references for
Polish phonology (documented in
[content/languages/pl/phonetics/README.md](../../content/languages/pl/phonetics/README.md)) rather than recalled
from memory or guessed — the brief's explicit instruction not to present a doubtful transcription as fact.

## Options considered

- **A `phonetic_representations`/`phonetic_topics` table, seeded from data or authored directly in Postgres.**
  Rejected — same reasoning as content, lessons, exercises and vocabulary (§1): two sources of truth for the same
  fact.
- **Requiring every representation to declare a topic, mirroring vocabulary's required category.** Rejected (§2):
  it would force an artificial taxonomy decision before any content could ship, for content (individual sounds)
  that does not always naturally group the way a vocabulary entry always belongs to exactly one topic.
- **Modelling phonetics progress with the same `saved/learning/learned`-style backward step vocabulary has.**
  Rejected (§5): there is no honest "I forgot this sound" backward correction the way there is for a word's
  memorised meaning; forward-only is the accurate model, and it needs no transition table at all.
- **A shared identifier or foreign key between `PhoneticRepresentation` and `VocabularyItem`.** Rejected (§12) per
  the explicit direction to keep the two contexts decoupled at the data level; a UI-only link was chosen instead,
  accepting that it points at a language's phonetics hub rather than one exact sound.
- **Free-text search (`q`) over IPA/description, mirroring vocabulary's folded-substring search.** Deferred (§8):
  not useful for IPA text a beginner cannot type, and the current dataset does not need it; can be added later
  without a model change.
- **Storing an IPA symbol as an image or rendering it through a custom font-glyph component.** Rejected (§13): IPA
  is ordinary Unicode text end to end; an image would break copy/paste, screen readers and search, and a custom
  component would need to special-case every symbol a future language's phonology introduces.
- **Rewarding topic completion with points in M10.** Rejected (§15) — the brief explicitly forbids inventing a
  reward rule without an agreed design, the same instruction M9 followed for vocabulary.
- **Pages at `/phonetics`, `/phonetics/:id`, with a `/profile`-style dev-proxy bypass.** Rejected (§11) — every
  milestone since M6 solved this by choosing a non-colliding page path instead.

## Consequences

- **Adding a language's or a topic's phonetics is files**
  (`content/languages/<code>/phonetics/*.json`); no domain, application, API or component code changes, proved the
  same way M5–M9 prove it (a fictional-language catalog in the application-layer tests).
- **A representation naming no topic is a first-class, permanent case**, not a migration placeholder — the query
  engine, the topic-progress tally and the visibility rule all handle it without special-casing call sites.
- **Progress can never be corrected backward.** A student who marks a sound `completed` by mistake has no "undo" —
  unlike vocabulary's `learned → learning`, there is no legitimate backward step modelled, and none is exposed by
  any route. This is a deliberate scope decision (§5), not an oversight; if it proves too rigid in practice, adding
  a backward step later is a new domain function and a new upsert case, not a redesign.
- **No search exists over phonetics content** (§8); a misspelled or IPA-unfamiliar query has no way to find a sound
  except browsing by topic/level/status.
- **Phonetics and Vocabulary share no data.** A word's exact pronunciation is not deep-linked from its vocabulary
  entry; the link goes to the language's phonetics hub. Closing this gap is future work (§12), not a defect in
  M10's own scope.
- **No reward exists yet for any phonetics progress** (§15); nothing in M10 grants points, and no event is even
  published for a later listener to consume (unlike vocabulary's discarded event) — the seam can be added when a
  reward rule is actually agreed.
- **`user_phonetic_progress` rows outlive a representation** that is later archived or removed from content: they
  are simply not listed, and are cleaned up only by user deletion (cascade) — the same limitation ADR-020/022
  document for `exercise_attempts`/`user_vocabulary`.
- **A seventh `pg` pool per API process now exists** (identity, profile, lessons, exercises, gamification,
  vocabulary, phonetics); a real Neon connection was never exercised (Docker Postgres in dev, PGlite in tests).
- **The model is prepared for, but does not implement, audio or pronunciation evaluation.** No `audioAssetId` or
  similar field was added speculatively (the brief's own instruction, §27-28); a future milestone adding one is a
  new optional field on `PhoneticRepresentation`, not a reshape.

## Sources verified

- Polish consonant IPA values and articulatory descriptions (retroflex vs. alveolo-palatal fricatives/affricates,
  `ł` as a labio-velar approximant, `ń` as a palatal nasal) — checked against standard academic descriptions of
  Polish phonology (consonant inventory and IPA values as documented in peer-reviewed phonetic literature, e.g.
  Jassem (2003), "Polish", _Journal of the International Phonetic Association_, cross-checked against Rocławski's
  _Zarys fonologii, fonetyki, fonotaktyki i fonostatystyki współczesnego języka polskiego_) on 2026-09-23, not
  invented or guessed. See
  [content/languages/pl/phonetics/README.md](../../content/languages/pl/phonetics/README.md).
- Polish nasal vowel values and their denasalization behaviour before stops / word-finally — checked against the
  same standard references on 2026-09-23.
- No CEFR "can do" descriptor or official phonemic inventory was consulted or claimed; a representation's
  `levelId` is the same "pedagogical metadata, not certification" position ADR-018/022 already took and verified.
