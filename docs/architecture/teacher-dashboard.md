# Teacher dashboard (M13)

Decision record: [ADR-024](../adr/adr-024-teacher-dashboard.md). API: [api/README.md](../api/README.md#teacher-dashboard-endpoints-m13).

A **read/aggregation capability**: it shows a teacher the learning activity of the students linked to them, from the
authoritative lesson (M6), exercise (M7) and gamification (M8) records. It changes nothing and decides no business
rule of its own beyond the metric definitions below.

## Layers

| Layer       | Where                                         | What                                                                                                                                 |
| ----------- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Domain      | `packages/domain/src/teaching`                | `assertCanLink`, metric definitions (`activeSince`, `isActiveStudent`, `accuracyPercent`, UTC weeks), roster query bounds/allowlists |
| Application | `packages/application/src/teaching`           | ports (`TeacherDashboardReadModel`, `TeacherStudentLinkRepository`), use cases, views                                                |
| Data        | `packages/data/src/teaching`                  | `teacher_students` table + migration, link repository, SQL read model, `teacher:admin` CLI                                           |
| Contracts   | `packages/contracts/src/teaching`             | strict queries, UUID param, allowlisted responses                                                                                    |
| API         | `apps/api/src/routes/teacher-dashboard*.ts`   | `/teacher-dashboard/*`, TEACHER-only, `no-store`, rate-limited, audit log                                                            |
| Web         | `apps/web/src/pages/teacher-*`, `components/` | `/teacher`, `/teacher/students/:studentId`                                                                                           |

## Authorisation model

1. **Authenticated** — session cookie (`401` otherwise).
2. **TEACHER role** — `requireRole` hook before any read (`403`), checked again inside every use case.
3. **Relationship** — the read model joins through `teacher_students` on the _session's_ teacher id. There is no
   teacher id in any path, query or body (an extra query key is a `400`).
4. **IDOR** — a student id is only looked up through the teacher's links. Another teacher's student, a non-existent
   id, a non-student user and a malformed id all return the same `404 {"error":"Student not found."}`.

The web `TeacherRoute` guard and the teacher-only nav link are UX only.

## Relationship management (operators)

```
pnpm --filter @tfm-bic/data db:migrate:teaching      # once, after Identity's migration
pnpm --filter @tfm-bic/data teacher:admin promote <email>
pnpm --filter @tfm-bic/data teacher:admin link   <teacherEmail> <studentEmail>
pnpm --filter @tfm-bic/data teacher:admin unlink <teacherEmail> <studentEmail>
```

Output names no account. Exit codes: 0 done, 1 rule violation/unknown account, 2 usage.

## Metric definitions

All timestamps are UTC instants (ISO 8601 in the API); the browser formats them in the viewer's zone, except week
labels, which are shown in UTC because the buckets are UTC.

| Metric                          | Definition                                                                                            | Source                          |
| ------------------------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------- |
| Students                        | Linked users whose role is still STUDENT                                                              | `teacher_students`, `users`     |
| Last activity                   | Latest of `lesson_progress.updated_at` (lesson started/completed) and `exercise_attempts.answered_at` | M6, M7                          |
| Active student                  | Last activity within the last **7 days** (inclusive), measured from the server clock                  | domain `isActiveStudent`        |
| Lessons completed / in progress | Count of `lesson_progress` rows with status `completed` / `in_progress`                               | M6                              |
| Exercise attempts               | Every stored attempt (M7: every well-formed submission is an attempt; retries count)                  | M7                              |
| Accuracy                        | correct attempts ÷ all attempts, whole percent (half up); **no attempts → "no data", never 0%**       | domain `accuracyPercent`        |
| Correct on the latest try       | Distinct exercises whose latest attempt (greatest `answered_at`, then greatest id) is correct         | M7 `summarizeAttempts` ordering |
| Points                          | Sum of the student's `point_transactions` (the ledger); detail uses M8's `loadFacts`                  | M8                              |
| Achievements                    | M8 unlocks with M8's texts                                                                            | M8                              |
| Published lessons per level     | Lessons M5's `ListContentUseCase` returns today; `null` if the level is no longer available           | M5                              |
| Weekly series                   | Last 8 ISO weeks (Monday 00:00 UTC): lessons completed, attempts, correct attempts, accuracy, points  | read model + domain             |

There is deliberately **no composite progress score**. Progress records whose lesson left the catalog still count
in the totals and are reported as "no longer in the catalog".

## Privacy — what a teacher can and cannot see

**Can see** (linked students only): first name, last name, nickname, avatar, the metrics above, recent lesson
titles/statuses/dates, recent exercise verdicts (correct/incorrect) with time and lesson title, unlocked achievements.

**Cannot see**: email, role, password hash, sessions/tokens, email-verification state, account timestamps, submitted
answers, vocabulary/phonetics progress, video/audio jobs, any student not linked to them. Responses are Zod allowlists,
so an unlisted field is stripped even if a query selected it; the read model never selects emails or answers.

**Logging**: viewing a student emits `teacher.student_viewed` with `teacherId` and `studentId` (user ids only, no
names/emails). The operator CLI prints no account identifiers.

## Pagination, filtering, search, sorting

- `page` (1–1000, default 1) and `pageSize` (1–50, default 20), digits only; enforced by contract and use case.
- `activity=active|inactive` (definition above).
- `q`: trimmed, 1–50 chars, no control characters; matched with `strpos(lower(name…), lower($q))` — a plain
  substring, so `%`/`_` are ordinary characters; always a bound parameter; only teacher-visible fields (names,
  nickname) are searched. No index: the search runs over one teacher's roster only.
- `sort=name|lastActivity|points|lessonsCompleted|accuracy`, `direction=asc|desc` (default: name A→Z, measures
  high→low). Each field maps to a fixed SQL expression; `NULLS LAST`; ties by `student_id`.
- No language/CEFR filter: a student has no language or level attribute in the data model (progress is per lesson);
  the detail groups lesson progress by the lessons' language/level instead.

## Query architecture and performance

See ADR-024. Statement counts: overview 1, roster page 1, detail 5 — verified with 300 students
(`teacher-dashboard.read-model.test.ts`). Indexes used: `teacher_students_pk` (teacher → students),
`teacher_students_student_id_idx` (new), and the existing `lesson_progress_pk`,
`exercise_attempts_user_exercise_answered_idx`, `point_transactions_user_id_idx`. No new index on activity tables was
needed. EXPLAIN ANALYZE (PGlite): detail queries use those indexes at 10 000 users (~1 ms each); the roster query at a
15% roster share used sequential scans + hash semi-joins (~50 ms at 2 000 users / 40 000 attempts).

**Known limitation**: the roster query aggregates the teacher's whole roster on every page (needed to sort by
aggregates). Plans were not measured on production Postgres or on rosters of thousands of students; if that becomes
slow, add a rebuildable per-student summary projection rather than a cache.

## Frontend

- `/teacher`: overview cards (with the definitions in words), search/filter/sort/paging in the URL, a captioned
  table whose lower-priority columns collapse under `md` into a summary line (no sideways scroll at 375 px).
- `/teacher/students/:studentId`: lessons per level (native `<progress>` + text), recent lessons, exercise
  performance, points/achievements, weekly chart (CSS bars, `aria-hidden`) followed by the same data as a table.
- Loading, empty ("no students linked yet" vs "no match"), retryable error, forbidden and not-found states. Status and
  verdicts are words, never colour alone. No charting library was added.
