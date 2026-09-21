# ADR-019: Lessons — content stays in files, progress is per student

Status: ACCEPTED
Date: 2026-09-21 (M6 — Lessons)

Builds on [ADR-018](adr-018-content-languages.md) (languages, levels and content as validated files) and
[ADR-017](adr-017-student-profile.md) (session-derived identity, page-vs-API paths). Reference:
[content-architecture.md](../architecture/content-architecture.md) (Lessons section) and the
[API docs](../api/README.md).

## Context

M6 is the first student-facing lesson experience: discover lessons by language and level, open one, read
it, mark it completed, and see that state again after a refresh. It has to work for Polish A1 today and
for any language or level added later **without new code**, and it must keep two things apart that are
easy to blur: **lesson content** (shared by every student) and **lesson progress** (one student's state).
It must not become exercises, scoring, points or a CMS — those are later milestones.

## Decision

### 1. A lesson is not a new kind of record

A lesson is an M5 content item whose `type` is `lesson`. Its identity is its permanent `ContentId`
(`pl-greetings`): stable, language-prefixed, already safe for URLs, unchanged by title, description,
wording or order changes. There is no `Lesson` table, no second id, no slug, and nothing about a lesson
is copied anywhere. `LessonId` is a domain alias of `ContentId`; `isLesson(item)` is the only lesson-specific
predicate. Visibility is not restated: the lesson use cases are built on `GetContentUseCase` and
`ListContentUseCase`, so a lesson is visible exactly when M5 says its content is (published, active
language, `available` level) **and** it is a `lesson`. Every other case — missing, draft, archived,
`explanation` type, hidden level — is the same `LessonNotFoundError` and the same `404`.

### 2. Who owns what

| Concern                                                                      | Owner                                                       |
| ---------------------------------------------------------------------------- | ----------------------------------------------------------- |
| Lesson text, blocks, title, description, order, language, level, publication | the JSON files under `content/languages/` (unchanged by M6) |
| Whether a student may see a lesson                                           | application use cases, over the `ContentRepository` port    |
| A student's status in a lesson, and when they started and completed it       | PostgreSQL, table `lesson_progress`                         |
| The link between them                                                        | `lesson_progress.lesson_id` = the content id, as text       |

`lesson_id` is deliberately **not** a foreign key: the rows it names are files (ADR-018 predicted this and
named it as the point to reconsider). Integrity is kept in three places instead: the use cases only write
progress for a lesson that exists and is visible; a `CHECK` mirrors the content-id pattern and length; and
the repository re-validates the id it reads. A lesson later archived or renamed in error leaves its progress
row behind, unlisted and harmless; there is no orphan clean-up job. Publication is unchanged: set
`status: published` in the file and run `pnpm content:validate`; the API loads and validates it at start-up.
Content bodies are not stored, cached or duplicated in PostgreSQL.

### 3. The progress model

One table, `lesson_progress(user_id, lesson_id, status, started_at, completed_at, updated_at)`, in its own
`lessons` bounded context (own schema file, connection factory, migration folder and tracking table, per the
M4 convention).

- **Primary key `(user_id, lesson_id)`**: one logical record per student per lesson, enforced by the
  database. It is also the index every query needs (`WHERE user_id = ? [AND lesson_id IN (…)]`), so no other
  index exists.
- **Foreign key** `user_id → users(id) ON DELETE CASCADE`: no orphaned progress when the account-deletion
  milestone arrives.
- **Stored statuses are `in_progress` and `completed` only.** "Not started" is the absence of a row, so it is
  derived, never stored. A `CHECK` ties `completed_at` to `status = 'completed'` in both directions.
- **Times come from the `Clock` port**, passed in by the use case; the database's `now()` is never used, so
  tests and production agree on what "now" is.
- The rules (`startLesson`, `completeLesson`) are pure domain functions. The repository port exposes
  `start` and `complete` as **single atomic operations**, implemented as one
  `INSERT … ON CONFLICT DO UPDATE … RETURNING`. A read-then-write in the use case could not promise that two
  racing requests neither duplicate a row nor let a late `start` move a completed lesson back to in progress.
- Nothing needed later (scores, points, time spent) is added now; each can be a new column or table without
  touching content.

### 4. Semantics

- **Opening a lesson starts it.** The page sends `POST /lessons/:id/start` once (a ref guards React's
  double effects). It is forward-only and idempotent: it never changes an in-progress or completed record.
  This is what makes "in progress" a real, persisted, listable state. `GET` never writes.
- **Completion is explicit and only explicit.** `POST /lessons/:id/complete` from the "Complete lesson" button.
  Opening, reading, scrolling or calling `start` never completes. It is idempotent: repeating it changes
  nothing, not even `completed_at` (the first completion time is kept). A lesson never started can be completed
  directly; it is started and completed at that moment.
- **Resume.** A completed lesson opens as completed; an in-progress one is identifiable in the list and on its
  page ("Continue lesson"); a refresh loses nothing. **Resume position within a lesson is not part of M6;
  lesson status is persisted.**
- Completion awards nothing and emits nothing. No `LessonCompleted` event or bus was added: there is no
  consumer, and `CompleteLessonUseCase` is the one place a later milestone can publish it from.

### 5. API and access

`GET /lessons?language=&level=`, `GET /lessons/:lessonId`, `POST /lessons/:lessonId/start`,
`POST /lessons/:lessonId/complete` — all **authenticated**, enforced server-side by the same `authenticate`
hook as `/profile`, generic across languages and levels.

- **The user is always the session's.** No id, time or status is accepted from the client. The action routes
  take no body: the request schema is `z.strictObject({}).optional()`, so a body naming `userId`,
  `completedAt`, `status`, `lessonId` or anything else is a `400` (not silently ignored, so a client never
  believes it set one), with a 1 KB body limit.
- Writes also pass the `Origin` check (defense in depth behind `SameSite=Strict`).
- Ids and query values are validated against the strict content-id / language / level patterns (`400`);
  every "cannot see it" outcome is one `404` with a fixed body that never echoes the input.
- Responses are allowlisting schemas; the list returns metadata and progress only (no blocks); the detail
  response re-validates blocks, so a markup-looking string or an unknown block type never leaves the API.
- Lesson responses carry `Cache-Control: private, no-store` (progress is per student); the routes are
  rate-limited per client (120/min, relaxed only under `E2E_RELAXED_RATE_LIMITS`).
- There is no route to create, edit, publish or delete a lesson, and none acts on another student's progress.

### 6. Route identity: API `/lessons`, pages under `/learn/lessons`

The API paths are the resource paths (`/lessons`, `/lessons/:id`) that the API conventions and the brief
call for. The natural page paths would be the same, and a page and an API sharing a path needs the fragile
dev-proxy bypass ADR-017 recorded for `/profile` (and a matching production reverse-proxy rule). M5 avoided
repeating it; M6 does too. The pages are **`/learn/lessons`** (language → level → lessons, choice in the query
string: `?language=pl&level=a1`) and **`/learn/lessons/:lessonId`**. React Router ranks these static segments
above the public `learn/:languageCode?/:levelId?` route, and no language code can be spelled `lessons`
(codes are two or three letters), so they never collide; a router test asserts it. This is a deliberate
deviation from the brief's illustrative `/lessons` page path. The old placeholder page route `/lessons` was
removed and is not reserved.

### 7. The frontend is a continuous page

A lesson is a short ordered sequence of typed blocks, so the viewer is one continuous page followed by the
completion action — no slide engine, no in-lesson position to store. Blocks go through the existing
`ContentBlocks` renderer (fixed components per known type, text only, neutral notice for an unknown type, no
raw HTML, no dynamic imports). Server state is TanStack Query under the user-scoped root `["lessons", …]`
(dropped on logout and login); after `start`/`complete` the server's answer is written into the cached lesson
and every cached list is marked stale. The language/level chooser was extracted from the M5 page into a shared
`LanguageLevelPicker`. Status is always stated in words (with a check for completed), never by colour alone.

### 8. Not done, on purpose

- **Pagination.** A level has a handful of lessons and the list carries metadata only, so no paging. The
  response is an object (`{ lessons }`), so adding `limit`/`cursor` later is additive.
- **Persisting the student's chosen language/level (enrolment).** ADR-018 expected it in M6, but nothing in the
  M6 requirements needs it: the choice is in the URL, the lesson list is one click from the nav. It remains
  unassigned.
- **A domain event, exercises, points, block-level resume, media, teacher editing** — later milestones.

## Options considered

- **A `lessons` table in PostgreSQL, seeded from files.** Rejected, for the reason ADR-018 rejected content
  tables: a second copy of the content to keep in sync, seed/upsert machinery, and availability rules split
  between a database and the file tree. The port keeps the door open.
- **Progress written by `findByUserAndLesson` then `save`.** Rejected: two racing requests could duplicate or
  regress a record; the atomic upsert costs nothing extra.
- **Storing `not_started` rows** (one per student per lesson, on first view). Rejected: redundant, and a `GET`
  would have to write.
- **Auto-completing on open, on scroll to the end, or on the API call.** Rejected by the brief and by
  product sense: completion is a deliberate act, and a later scoring milestone needs a trustworthy signal.
- **Block-by-block stepper / block-level resume.** Rejected for M6: no need with 5–10 short blocks, and it
  would add persisted state and focus management for little value.
- **Page routes at `/lessons` with a proxy bypass.** Rejected (§6).
- **A client-generated or slug-based lesson id.** Rejected: the content id is already stable and safe.
- **Per-language lesson code (pages, controllers, repositories).** Rejected outright, as in ADR-018;
  `no-language-branching.test.ts` covers the new code and an application test runs the same use cases over
  two fictional languages.

## Consequences

- **Adding a lesson, language or level is still data only.** Nothing in lesson code names a language.
- **Lesson bodies are still readable without an account through M5's public `GET /content/:id`.** M6's
  authenticated API adds per-student progress and an explicit access boundary, but it does not hide the
  text, because ADR-018 made content public on purpose. Gating bodies (subscriptions) is a later, deliberate
  change to those routes — it should be decided once, together with this API.
- `/learn/pl/a1` (public read-only content browser) and `/learn/lessons` (student lessons) overlap in what
  they show; the first is for visitors, the second is the product. Merging them is a product decision, not an
  M6 one.
- **Concurrency guarantees rest on a single-statement upsert.** The repository tests run on PGlite, which
  serialises queries, so they prove the SQL semantics and the constraints but not truly parallel connections;
  behaviour on a real Neon/Postgres pool has not been exercised.
- Merely opening a lesson marks it in progress (by design); a failed `start` is silent and the lesson stays
  readable and completable.
- Progress rows outlive their content if a lesson is archived; they are not listed and are cleaned up only by
  user deletion (cascade).
- The primary `Button` now uses navy text on the orange accent (about 5.5:1) instead of white (about 2.8:1),
  which is below WCAG AA; this changes every primary button in the app and was needed for the completion action.
  The skip-to-content link still uses white on orange.

## Sources verified

None new. No linguistic claim was added: the Polish A1 content is M5's and is unchanged (see ADR-018 for how
it was checked). The contrast ratios above are computed from the palette's RGB values with the WCAG relative
luminance formula, not taken from a tool.
