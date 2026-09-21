# ADR-020: Exercises — content in files, evaluation by a per-type strategy, attempts as append-only history

Status: ACCEPTED
Date: 2026-09-21 (M7 — Exercises)

Builds on [ADR-018](adr-018-content-languages.md) (content is validated files), [ADR-019](adr-019-lessons.md)
(a lesson is a content item; only a student's progress is stored) and [ADR-017](adr-017-student-profile.md)
(session-derived identity, page-vs-API paths). Reference: [exercise-architecture.md](../architecture/exercise-architecture.md),
[content-architecture.md](../architecture/content-architecture.md) and the [API docs](../api/README.md).

## Context

M7 is the first time a student _does_ something with content: open an exercise, answer it, get an immediate
verdict, retry, move on. It has to work for Polish A1 today and for any language, level and exercise type added
later **without duplicating application logic**, and it must keep three things apart that are easy to blur:

- **what an exercise expects** (its content and configuration),
- **how an answer is judged** (evaluation — business-critical, must be server-side and deterministic),
- **what a student did** (attempts — learning data that later milestones will build on).

It must not become points, XP, streaks, adaptive learning, AI-generated feedback or a CMS — those are later
milestones — but it must leave their raw material intact.

## Decision

### 1. Exercises are content, not a new table

An exercise is a validated JSON file under
`content/languages/<code>/levels/<level>/exercises/<exercise-id>.json`, tied to its lesson by `lessonId`, read
through an `ExerciseRepository` port (today `CatalogExerciseRepository`, over the same in-memory catalog the content
repository serves). PostgreSQL stores **one** thing: `exercise_attempts`. This is the same split ADR-018 made for
content and ADR-019 for lessons, and it is a deliberate deviation from the brief's "possible conceptual tables:
`exercises`, `exercise_attempts`".

Why: an `exercises` table would be a second copy of the content to keep in sync, with seed/upsert machinery and
publication rules split between a database and the file tree — the reasons ADR-018 rejected content tables. What
the brief asked the database to enforce is enforced, in the same fail-fast loader that guards all content:

| Wanted                                 | Where it is enforced                                                                                       |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Exercise belongs to a valid lesson     | Catalog validation: the lesson exists, **is a lesson**, has the same language and level (and is published) |
| Exercise id uniqueness                 | Catalog validation (and ids never overlap content ids)                                                     |
| Deterministic ordering within a lesson | Explicit `order`, unique per lesson (validated), ties broken by id in the use case                         |
| Valid user / no orphaned attempts      | Foreign key `exercise_attempts.user_id → users(id) ON DELETE CASCADE`                                      |
| Attempts are historical                | The attempt port has one write (append) and no update or delete; the table is only ever inserted into      |

The triggers to move exercises into PostgreSQL are the ones ADR-018 lists (content editing by non-developers, a
CMS, per-student exercise generation); the port keeps that door open. `exercise_attempts.exercise_id` is a
validated id held as text, **not** a foreign key, for the same reason `lesson_progress.lesson_id` is not one.

### 2. The exercise model

`Exercise` = the common fields (`id`, `lessonId`, `languageId`, `levelId`, `status`, `order`,
`instructionLanguage`, `prompt`, optional `explanation`) + a `type` + that type's `configuration`, as a union
discriminated on `type`.

- **Identity is the permanent `ExerciseId`** (`pl-greetings-polite-hello`): the same strict slug rules as a content
  id, language-prefixed, and unique across exercises _and_ distinct from every content id. Prompt, options,
  explanation and order can all change; the id never does (retire an exercise with `status: archived`).
- **Status is M5's** (`draft | published | archived`): only `published` is ever shown, and only when its lesson is
  visible under the existing lesson rule (published, active language, `available` level). Every "cannot see it"
  reason is the same `ExerciseNotFoundError` → one `404`. There is no second publication model.
- There are no `createdAt`/`updatedAt` fields: like all content, history is Git's.
- Nothing about an exercise names a language. `languageId` is data.

### 3. Adding a type touches its own module and one registry line per layer

```
domain:     types/<type>.ts          configuration + answer + evaluator (parse, evaluate) + presenter
            exercise.ts / exercise-registry.ts   one union member, one registration
contracts:  exercise/types/<type>.schema.ts      configuration schema + presented schema
            exercise-file.schema.ts / exercise-response.schema.ts   one union member each
web:        <type>-exercise-view.tsx             the view
            exercise-view-registry.ts            one entry (label, how to say the correct answer, the view)
```

There is no evaluator with a chain of `if (type === …)`: an `ExerciseTypeRegistry` maps the type to a registered
evaluator/presenter pair, so no type's evaluator is touched by another's. The registry is built by the application
from a fixed list; the type comes from validated content, a request cannot name an evaluator, lookups use a `Map`
(so `__proto__`/`constructor` resolve to nothing), nothing is imported by a string, and an unregistered type is
refused (`UnsupportedExerciseTypeError` → `501`). Content cannot define code: configurations are plain data
validated by strict per-type schemas.

`EXERCISE_TYPES` in the domain and each layer's registry are kept honest by tests: the default registry must
support every declared type, so a type added in one place and forgotten in another fails.

### 4. Content, evaluation and presentation are three different things

- **Configuration** (content) says what is expected: `correctOptionId`, `acceptedAnswers`, `correctAnswer`.
- **Evaluator** (code) says how an answer is judged. It is pure and deterministic: exercise + answer in, result
  out; no database, HTTP, React or clock; it never mutates the exercise.
- **Presenter** (code) says what a student may see _before_ answering. It builds the presentation field by field
  (options as `{id, text}`; nothing for text and true/false), so the answer key and the explanation are left out
  **by construction**, not filtered afterwards.

The answer key is protected in depth: the presenter; the allowlisting response schema (Zod drops any key it does
not name, so even a presenter that returned too much could not leak); the client contract, which drops it again;
and tests at every layer that inspect the real HTTP bodies (including a stored exercise carrying extra fields).
The server is authoritative: the client never says whether it was right.

### 5. Answers and the text policy

An answer is `{ "answer": <string | boolean> }` — an option id, typed text or a boolean. **The client cannot
select an evaluator**: the exercise's own type does. The request schema is strict, so `correct`, `userId`,
`score`, `answeredAt`, an exercise id or type in the body is a `400`, never ignored.

Evaluation has two steps. `parseAnswer(exercise, input)` checks the _shape_ of an untrusted input against this
exercise and throws `InvalidExerciseAnswerError` for anything that is not a well-formed answer to it (an option the
exercise does not offer, a string for true/false, an empty text answer). Such an input is **refused (`400
Invalid answer.`), not judged, and never becomes an attempt** — no student interface can produce it. `evaluate`
then judges a well-formed answer.

The text-answer policy is one small function, `normalizeTextAnswer`, and nothing else is inferred:

- Unicode **NFC** (so a letter typed as base + combining mark equals the same letter as one character);
- **trim** surrounding whitespace (whitespace _inside_ is left alone — no collapsing);
- **lower-case in the exercise's own language** (`toLocaleLowerCase(languageId)`), only when the exercise is not
  case-sensitive (default: it is not; content states it explicitly). This is lower-casing both sides, not full
  Unicode case folding;
- **diacritics and punctuation are never normalised away** (`żółty` is never `zolty`); no fuzzy matching, no
  transliteration, no AI. A variant (`Dobranoc.`) is accepted only if listed in `acceptedAnswers`; duplicates that
  normalise equal are a content error.

The stored answer is the validated answer (a text answer without its surrounding whitespace, otherwise as typed).
On the client, autocorrect, autocapitalisation and spellcheck are switched off for the text box, because on a phone
they would rewrite the very word being spelled.

### 6. Attempts: every submission is one immutable row

`exercise_attempts(id bigint identity, user_id, exercise_id, submitted_answer jsonb, correct, answered_at)`.

- **Every submitted, well-formed answer is an attempt**; a retry is another row and never touches an earlier one.
  Two wrong answers and a right one are three rows, not one.
- The server decides every value: `user_id` from the session, `correct` from the evaluator, `answered_at` from the
  `Clock` (never the database's `now()`, never the client). The insert is one statement, hence atomic; no other
  state is updated, so no transaction infrastructure was added.
- `id` is an identity so the **later insert is always distinguishable**, which makes "the latest attempt" well
  defined even for equal timestamps. `submitted_answer` is `jsonb` so one column serves every present and future
  type without a migration per type, and keeps its type (`true` stays a boolean, `"true"` stays text). `CHECK`s
  mirror the id pattern and bound the answer size.
- **One index**, `(user_id, exercise_id, answered_at)`, serves every query the table has. The brief's second
  candidate, `(exercise_id, answered_at)`, has no current query and was not added.
- **The "current result" is derived, not stored**: the latest attempt's correctness plus a count, from one query
  (`DISTINCT ON (exercise_id)` with a window `count(*)`), matched by tests to a single domain definition of
  "latest" (`summarizeAttempts`). No projection table duplicates it.
- Nothing computed for later: no points, XP, streak, achievement, score or adaptive value. Correctness,
  timestamps, the number of attempts and the exercise identity are exactly the raw material a later consumer needs.
- Immutability is guaranteed by the absence of any update/delete path (port and API), not by a database trigger
  (a trigger would also have to be exempted for the user-deletion cascade).

Practising never completes a lesson: exercise answers and lesson completion are independent, and M6's semantics
are unchanged.

### 7. API and access

`GET /lessons/:lessonId/exercises`, `GET /exercises/:exerciseId`, `POST /exercises/:exerciseId/answer` — all
**authenticated** (the same `authenticate` hook as lessons), generic, `Cache-Control: private, no-store`,
`Origin`-checked on the write. Reads are limited to 120/min and **answers to 60/min** (each is a stored row), with
a 2 KB body cap. Ids are matched against the strict pattern (`400`), every hidden outcome is one fixed `404`,
an invalid answer is a fixed `400`, an unregistered type a fixed `501`, and anything else — including an exercise
whose stored configuration is broken — is a generic `500` that leaks no configuration. The submitted answer is
**never logged** (it is the student's own text); the log records the exercise id, whether it was correct, and the
request id. There is no route that creates, edits, publishes or deletes an exercise, and none that reads or writes
another student's attempts (there is no user id anywhere in a URL, query or body).

There is deliberately no attempt-history endpoint: the UI needs only the latest result and the count, which are
part of the exercise and list responses. Adding one later is additive.

### 8. The frontend

Pages live under **`/learn/exercises/:exerciseId`** (behind login) for the reason ADR-019 §6 gave for lessons:
`/exercises` is the API path, and sharing it needs the fragile dev-proxy bypass ADR-017 recorded. The old
`/exercises` placeholder route was removed and is not reserved; a router test asserts the static
`learn/exercises` segment outranks the public `learn/:languageCode/:levelId` route.

- A generic `ExerciseRenderer` picks the view for the exercise's type from a registry; the three views use native
  radio groups and a labelled text box (keyboard operable, state stated in words and marks, never colour alone,
  text rendered as text). There is no per-language view, and a type the registry does not know renders a neutral
  notice and none of its data.
- The `ExercisePlayer` shows the server's verdict, correct answer and feedback in words, moves focus to the result
  (the submit button is disabled once a verdict shows, and focus would otherwise be lost), and offers **Try again**
  (a fresh, empty view with focus on its first control; the next answer is another attempt) and **Next exercise**
  or **Back to lesson**. The lesson page gains a **Practice** section (a `practice` slot in `LessonViewer`), a
  list with kind, state in words and one link per exercise. An answered-count is stated by the server.
- Server state is TanStack Query under the user-scoped root `["exercises", …]` (dropped on logout/login). After a
  submission the server's result is written into the cached exercise and lists are marked stale; nothing is copied
  into Zustand and no exercise bank is loaded globally. One submission is in flight at a time (a disabled button
  alone let a double-click send two).

### 9. Content validation

Per file (strict Zod): type, configuration, prompt, ordering, plain text only (no markup or control characters),
bounded lengths. Multiple choice has 2–8 options with unique ids and texts and **exactly one** correct option —
it cannot even be written down otherwise, because there is no per-option flag and unknown keys are errors.
Whole catalog: duplicate ids, id/language namespace, lesson existence and type, matching language and level, unique
order per lesson, and published exercises only on published lessons in available levels. `pnpm content:validate`,
the Jenkins Content Validation stage, API start-up and a Vitest test over the shipped tree all run the same loader.

### 10. Not done, on purpose

Points, XP, achievements, streaks, leaderboards, adaptive learning, recommendations, spaced repetition, AI feedback,
audio/pronunciation, teacher analytics, an exercise editor, more exercise types (matching, ordering, fill-in-the-blank,
listening…), pagination of exercise lists, an attempt-history endpoint, attempt retention/deletion workflows (a later
GDPR milestone; the foreign key already cascades on user deletion).

## Options considered

- **An `exercises` table seeded from files, or authored in the database.** Rejected (§1).
- **A single evaluator with `switch (type)`.** Rejected: every new type edits the shared function, and the brief
  forbids it. A registry costs one small file per type.
- **A plugin platform (dynamic loading, per-type packages).** Rejected as over-engineering: a fixed list of
  in-repo types with a registry gives isolation without loading code by name.
- **The client sends `type` (or an evaluator name) with the answer.** Rejected: the exercise already has a type, and a
  client choosing it would be a way to mis-evaluate.
- **Judge an invalid answer as incorrect.** Rejected: it would store junk attempts and blur "wrong" with "not an
  answer". Refusal is the honest outcome.
- **Store only the latest result per exercise.** Rejected: it destroys the raw history future milestones need.
  Storing the latest _and_ the history duplicates data; the latest is derivable in one query.
- **Reveal the answer only after N failed attempts.** Not adopted for M7: retry is allowed and the verdict shows
  the correct answer immediately (this is practice, not an exam). If a later product decision hides it, the change
  is in the evaluator's result shape, not the storage.
- **Fuzzy or accent-insensitive text matching by default.** Rejected: it would silently accept wrong Polish.
- **Page routes at `/exercises` with a proxy bypass.** Rejected (§8).

## Consequences

- **Adding an exercise is a file**; a language or level is still data; a new exercise _type_ is code by design
  (schema, evaluator, presenter, view, tests) because it changes what the platform can present and judge.
- The correct answer is shown after **every** submission, correct or not (including on a first wrong attempt), so a
  student can retry with it in front of them. That is a product choice for practice, recorded here so it is not
  mistaken for a leak.
- **Case-insensitive comparison uses the runtime's ICU** (`toLocaleLowerCase(languageId)`). It is correct for Polish
  and for languages such as Turkish, but it depends on the Node build shipping full ICU (official builds do); it was
  exercised on this project's Node 24 only.
- Attempts are learning data kept indefinitely; the deletion/export workflow is a later GDPR milestone.
- Repository tests run on PGlite, which serialises queries: constraints, the `jsonb` column and the "latest
  attempt" SQL are proved, true multi-connection concurrency on Neon/Postgres is not. A fourth `pg` pool per API
  process (identity, profile, lessons, exercises) is used; a real Neon connection was never exercised.
- `exercise_attempts` rows outlive their exercise if it is archived or removed from content: they are not listed
  and are cleaned up only by user deletion (cascade).
- Exercise content is readable only through the authenticated API, but the _lesson_ bodies remain public via M5
  (ADR-019). Exercise files are in the repository like all content.

## Sources verified

None new. No linguistic claim was added: every Polish exercise restates a fact already in the corresponding M5 lesson
(greetings, introducing yourself, polite words), and a shipped-content test checks each exercise's own answer key
against the real evaluators and that Polish diacritics are preserved. Behaviour of `String.prototype.normalize` and
`toLocaleLowerCase` was verified by tests on this project's Node version, not against external documentation.
