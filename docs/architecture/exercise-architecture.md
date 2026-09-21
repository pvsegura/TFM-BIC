# Exercise Architecture

Status: ACCEPTED, implemented in M7 | Related: [ADR-020](../adr/adr-020-exercises.md),
[ADR-018](../adr/adr-018-content-languages.md), [ADR-019](../adr/adr-019-lessons.md)

ADR-020 records _why_ (options, trade-offs); this document is the reference for how the exercise engine works and how
to extend it. The engine is **generic**: one set of use cases, routes, schemas and pages serves every language, level
and exercise type. There is no `PolishMultipleChoiceExercise`, no per-language controller, no per-language page.

## The three concepts

```
Exercise                       Evaluation                       Attempt
(content, in files)            (code, pure, server-side)        (data, in PostgreSQL)
  id, lessonId, language,        exercise + submitted answer      user, exercise,
  level, type, order, prompt,    → normalised comparison          submitted answer,
  configuration, status            → { correct, feedback,         correct, answered at
                                       correctAnswer }            — append-only history
```

- **Content says what is expected** (`correctOptionId`, `acceptedAnswers`, `correctAnswer`). It never contains
  evaluation logic, and evaluation code never contains a specific exercise's answer.
- **Evaluation says how an answer is judged.** It has no HTTP, React, database or clock concerns and is unit-testable
  with plain objects.
- **An attempt records what a student did.** The server decides every field but the answer.

## Supported exercise types (M7)

| Type              | Configuration (content)                                                    | Answer (what the student sends) | Evaluation                                                     |
| ----------------- | -------------------------------------------------------------------------- | ------------------------------- | -------------------------------------------------------------- |
| `multiple-choice` | `options[{id,text}]` (2–8, unique), `correctOptionId` (exactly one)        | the chosen option's id (string) | correct iff it equals `correctOptionId`; unknown id is refused |
| `text-answer`     | `acceptedAnswers[]` (1–20, no duplicates), `caseSensitive` (default false) | the typed text (string)         | `normalizeTextAnswer` on both sides, then membership           |
| `true-false`      | `correctAnswer` (boolean)                                                  | a boolean                       | correct iff equal; the strings "true"/"false" are refused      |

Every type also has an optional `explanation` (static feedback, shown only after an answer) and a `prompt`
(≤ 300 characters, plain text).

## The exercise model

```ts
// packages/domain/src/exercise/exercise-base.ts (common fields)
interface ExerciseBase {
  id: ExerciseId; // permanent, language-prefixed slug: pl-greetings-polite-hello
  lessonId: LessonId; // a content item of type "lesson", same language and level
  languageId: LanguageId;
  levelId: LevelId;
  status: ContentStatus; // draft | published | archived — M5's model, not a second one
  order: number; // unique within the lesson; gaps allowed
  instructionLanguage: LanguageId;
  prompt: string;
  explanation?: string;
}
type Exercise = MultipleChoiceExercise | TextAnswerExercise | TrueFalseExercise; // + { type, configuration }
```

- **Ids are stable.** Not the prompt. Wording, options, explanation and order may change; the id does not. Retire
  by `status: archived`.
- **Ordering is explicit.** `order` (unique per lesson), ties broken by id, never by file or insertion order.
- **Visibility** is one rule (`findVisibleExercise`): the exercise is `published` **and** its lesson is visible
  (`findVisibleLesson`: published, active language, `available` level, type `lesson`). Any other case is
  `ExerciseNotFoundError` → one `404`.

## Where each concern lives

| Concern                                    | Location                                                                                                                         |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| Types, ids, evaluator contract, evaluators | `packages/domain/src/exercise/` (`types/*.ts`, `exercise-evaluator.ts`, `exercise-registry.ts`)                                  |
| The evaluator registry                     | `ExerciseTypeRegistry` + `createDefaultExerciseTypeRegistry()` (domain)                                                          |
| Attempt model and "latest" definition      | `exercise-attempt.ts` (domain): `summarizeAttempts`                                                                              |
| Ports and use cases                        | `packages/application/src/exercise/` (`ExerciseRepository`, `ExerciseAttemptRepository`, list/get/submit)                        |
| File format and API shapes (Zod)           | `packages/contracts/src/exercise/` (`types/*.schema.ts`, `exercise-file.schema.ts`, `exercise-response.schema.ts`)               |
| Content loading and validation             | `packages/data/src/content/` (`load-content-catalog.ts`, `catalog-exercise-repository.ts`) and `validateContentCatalog` (domain) |
| Attempts in PostgreSQL                     | `packages/data/src/exercises/` (own bounded context, schema, migrations, repository)                                             |
| HTTP                                       | `apps/api/src/routes/exercises.route.ts` (thin), `exercise-error.mapper.ts`, `exercise-rate-limit.ts`                            |
| UI                                         | `apps/web/src/components/exercise-*.tsx`, `*-exercise-view.tsx`, `pages/exercise-page.tsx`                                       |

## Evaluator architecture

```
ExerciseTypeRegistry   (built by the application from a fixed list)
   type "multiple-choice" → { evaluator, presenter }
   type "text-answer"     → { evaluator, presenter }
   type "true-false"      → { evaluator, presenter }

evaluator.parseAnswer(exercise, input: unknown): TAnswer   // refuse anything that is not an answer to THIS exercise
evaluator.evaluate(exercise, answer: TAnswer): EvaluationResult
presenter.present(exercise): PresentedExercise             // what a student may see BEFORE answering
```

- `EvaluationResult = { correct, feedback, correctAnswer }`. `correctAnswer` is in the same shape as a submitted
  answer (an option id, text or boolean) so it stays language-neutral; each type's view says it in words.
- The registry rejects unsupported types safely and cannot be reached with user input: the type comes from validated
  content, lookups use a `Map`, nothing is imported or instantiated by a string.
- A malformed configuration that somehow reaches an evaluator throws `InvalidExerciseConfigurationError` (a server
  fault, a generic `500`), never a wrong verdict.

## Text answer normalization

`normalizeTextAnswer(value, { caseSensitive, locale })` is the entire policy:

1. Unicode NFC.
2. Trim surrounding whitespace (nothing inside is touched).
3. If not case-sensitive, lower-case using the exercise's language (`toLocaleLowerCase(languageId)`).

Diacritics and punctuation are kept; there is no fuzzy matching, no transliteration and no AI. Variants are explicit:

```json
"acceptedAnswers": ["Miło mi cię poznać.", "Miło mi cię poznać"]
```

An empty or whitespace-only answer, an answer over 500 characters, or one containing a control character or line
break is refused (`400`), not judged.

## Content schema (exercise file)

`content/languages/<code>/levels/<level>/exercises/<exercise-id>.json` (file name = id; `schemaVersion: 1`; strict —
unknown keys are errors):

```json
{
  "schemaVersion": 1,
  "id": "pl-greetings-polite-hello",
  "lessonId": "pl-greetings",
  "languageId": "pl",
  "levelId": "a1",
  "type": "multiple-choice",
  "status": "published",
  "order": 10,
  "instructionLanguage": "en",
  "prompt": "Which greeting is polite and suits someone you do not know well?",
  "explanation": "Dzień dobry is polite and works with people you do not know well. …",
  "configuration": {
    "options": [
      { "id": "a", "text": "Dzień dobry" },
      { "id": "b", "text": "Cześć" }
    ],
    "correctOptionId": "a"
  }
}
```

What the validators reject: an unknown `type`; a malformed or wrong-type `configuration`; a missing or markup-bearing
prompt; an invalid `order`; multiple-choice with fewer than 2 or more than 8 options, duplicate option ids or
texts, a correct option that is not offered, or more than one correct option (there is no per-option flag and no
list, so it cannot be expressed); text answers with no accepted answers or duplicates (after normalisation);
true/false whose `correctAnswer` is not a boolean; duplicate exercise ids (or one equal to a content id); a lesson
that does not exist, is not a lesson, or is in another language or level; two exercises with one `order` in a
lesson; a published exercise on an unpublished lesson or in a level that is not `available`. `pnpm content:validate`
reports every problem at once.

## Attempts

- **Every submitted, well-formed answer is an attempt** (retries included); attempts are never updated or deleted.
- Table `exercise_attempts`: `id` (bigint identity), `user_id` (FK → `users`, cascade), `exercise_id` (validated text,
  not an FK), `submitted_answer` (`jsonb`), `correct`, `answered_at` (from the `Clock`). One index
  `(user_id, exercise_id, answered_at)`; `CHECK`s on the id pattern and the answer size.
- The student's **current result** is derived from their attempts (latest attempt's correctness and a count) in one
  query; the domain function `summarizeAttempts` is the single definition of "latest" (greatest `answered_at`, ties
  by the later insert) and the SQL is tested against it.
- Future points, progress, streaks or adaptive features consume attempts; none is computed or stored in M7.

## API summary

| Method | Path                            | Notes                                                                                                            |
| ------ | ------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| GET    | `/lessons/:lessonId/exercises`  | The lesson's published exercises in order with the caller's results and `{total, answered}`; no options, no key. |
| GET    | `/exercises/:exerciseId`        | One exercise as a student may see it before answering, plus the caller's result.                                 |
| POST   | `/exercises/:exerciseId/answer` | Body `{ "answer": <string\|boolean> }` only. Returns `{ correct, feedback, correctAnswer, result }`.             |

Full detail and error bodies: [docs/api/README.md](../api/README.md).

## Frontend

`ExerciseRenderer` (one component) → `exercise-view-registry.ts` (type → view) → `MultipleChoiceExerciseView`,
`TextAnswerExerciseView`, `TrueFalseExerciseView`. `ExercisePlayer` wraps the flow: view → verdict
(`ExerciseResult`, a `role="status"` region present from the start) → Try again / Next exercise / Back to lesson.
Retry remounts the view empty and moves focus to its first control. Pages: `/learn/exercises/:exerciseId`; the lesson
page shows a Practice section. TanStack Query root `["exercises", …]` (user-scoped).

## How to add an exercise type (checklist)

1. **Domain**: `types/<type>.ts` with the configuration type, the answer type, an evaluator
   (`parseAnswer`, `evaluate`) and a presenter; add the id to `EXERCISE_TYPES`, one member to `Exercise` /
   `PresentedExercise`, and one line to `createDefaultExerciseTypeRegistry()`. Unit tests, including "does not
   mutate", "deterministic" and "refuses a malformed answer".
2. **Contracts**: `exercise/types/<type>.schema.ts` (a strict configuration schema with its own cross-field checks and
   a presented schema); one member in `exercise-file.schema.ts` and one in `exercise-response.schema.ts`; widen
   `exerciseAnswerRequestSchema`/`exerciseAnswerResponseSchema` if the answer shape is new.
3. **Web**: a view component and one entry in `exercise-view-registry.ts` (label, `describeAnswer`, view).
4. **Content**: files, then `pnpm content:validate`.
5. Nothing else: no lesson, language, profile, authentication or other evaluator changes; `shipped-content` and
   registry-completeness tests fail loudly if a layer was forgotten.

## Security posture (summary)

Server-authoritative evaluation; answer keys never in an API response before an answer (presenter + allowlisting
schemas + tests on real bodies); strict answer-only request (mass assignment refused); session-only identity, no
user id in any URL/query/body; append-only attempts; fixed error bodies, generic `500`; answers never logged;
`no-store`; rate limits (answers 60/min); plain-text content only, no raw HTML anywhere in the web app (a guard test
scans it), no code from content. See [security-baseline.md](../security/security-baseline.md).
