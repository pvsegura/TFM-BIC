# ADR-024: Teacher dashboard — operator-managed teacher–student links and a teacher-scoped SQL read model

Status: ACCEPTED
Date: 2026-09-26 (M13 — Teacher Dashboard)

Builds on [ADR-006](adr-006-authentication.md) (STUDENT/TEACHER roles, server-side `requireRole`),
[ADR-019](adr-019-lessons.md) (lesson progress), [ADR-020](adr-020-exercises.md) (append-only attempts, M7's
"latest" definition) and [ADR-021](adr-021-gamification.md) (the points ledger is the truth). Reference:
[teacher-dashboard.md](../architecture/teacher-dashboard.md) and the [API docs](../api/README.md).

## Context

M13 lets a teacher see the learning activity of _their_ students. Before M13 the TEACHER role existed but was
unreachable (registration always creates a STUDENT), no teacher–student relationship existed, and every read API
was scoped to the session's own user. Three decisions were needed:

1. **How a link — and a TEACHER — comes into existence.** The domain model sketches "Teachers/Students +
   Invitations", but an invitation flow (codes, consent, expiry) is a product design of its own.
2. **How to aggregate four contexts (Profile, Lessons, Exercises, Gamification) for a list of students** without
   the per-student query pattern (N+1) and without duplicating their rules.
3. **How to page and sort** a list whose sortable columns are aggregates (points, accuracy, last activity).

## Decision

### 1. A minimal link table, managed by an operator

`teacher_students (teacher_id, student_id, linked_at)`, primary key `(teacher_id, student_id)`, an index on
`student_id`, `CHECK (teacher_id <> student_id)`, both columns `ON DELETE CASCADE` to `users`. No school, class or
invitation. The only writers are three operator use cases (`PromoteUserToTeacher`, `LinkStudentToTeacher`,
`UnlinkStudentFromTeacher`) run from `pnpm --filter @tfm-bic/data teacher:admin`. No production HTTP route creates a
link or changes a role, so neither a teacher nor a student can grant themselves access. The domain rule
(`assertCanLink`: a TEACHER, a STUDENT, two different users) is enforced by the use case; a linked student cannot be
promoted until unlinked. E2E reaches the same use cases through `POST /teacher-dashboard/_test/links`, registered
only when `NODE_ENV=test` **and** the E2E composition enables it (the test email inbox's double guard).

### 2. A dedicated, read-only, teacher-scoped read model in `packages/data`

`TeacherDashboardReadModel` (port in `packages/application`, Drizzle adapter in `packages/data/src/teaching`) runs
grouped SQL over the authoritative tables. Every statement starts from a `roster` CTE —
`teacher_students WHERE teacher_id = $session_teacher JOIN users … AND role = 'STUDENT'` — and restricts each
activity table with `user_id IN (SELECT student_id FROM roster)`. Consequences:

- **Authorisation is structural**: a student outside the teacher's links is never read, whatever id a client sends.
  The student-detail query authorises _and_ loads in one statement; the follow-up activity queries run only after it
  returned a row.
- **No N+1**: overview = 1 statement, one roster page = 1 statement (page and total together), student detail = 5
  statements — independent of the number of students (proven by a 300-student test counting statements).
- **No duplicated rules**: points = `sum(point_transactions.amount)` (M8's own `loadFacts` derivation, cross-checked
  by a test); "latest attempt" uses M7's ordering (`answered_at DESC, id DESC`); lesson states are M6's stored
  statuses. The student detail reads points and achievements through M8's own `GamificationRepository` and
  `toAchievementViews`, and "published lessons per level" through M5's `ListContentUseCase`.
- Reading other contexts' tables from one adapter is a deliberate exception to "each context reads its own tables",
  limited to **reads** in this one module. No projection table, cache, CQRS framework or event sourcing.

### 3. Offset paging (page/pageSize) for the roster

Other lists use keyset cursors. The roster's sortable measures are aggregates computed for the teacher's whole roster
on every request anyway, so a cursor would not avoid that work and would need a composite cursor over aggregate
values. The offset is bounded by one teacher's roster (not the whole table); `pageSize ≤ 50` and `page ≤ 1000` are
enforced by the contract **and** the use case. Sorting uses an allowlist that maps each field to a fixed SQL
expression; direction is `ASC`/`DESC` from a map; `NULLS LAST` and a `student_id` tie-break make pages stable.

## Consequences

- A new teacher metric is a new column in the read model plus its documented definition — never a calculation in
  React.
- The read model depends on the physical schemas of four contexts; a change to those tables must run its tests
  (`teacher-dashboard.read-model.test.ts`), which exercise the real SQL on PGlite.
- Operators need database access to link students. A self-service flow (invitations with student consent) is future
  work and would add writers to `teacher_students` without changing the read side.
- Query plans were inspected (EXPLAIN ANALYZE on PGlite): with 10 000 users the student-detail queries use the
  existing `user_id`-leading indexes (~1 ms each); with the teacher owning 15% of 2 000 users the roster query chose
  sequential scans + hash semi-joins (~50 ms). Re-check plans on production-sized data; if rosters become large,
  a rebuildable per-student projection is the documented next step (it must be rebuildable from the ledger, ADR-021).

## Alternatives considered

- **Frontend calls each context's API per student** — N+1 over HTTP, and those APIs are session-scoped. Rejected.
- **Batched per-context ports (`loadTotalsFor(userIds[])`)** — keeps table ownership but cannot sort/page by an
  aggregate across contexts without loading the whole roster into Node. Rejected for the list; used in spirit for the
  detail (M8's repository).
- **Invitation codes / add-by-email** — larger product scope; add-by-email also enables account enumeration and
  lacks student consent. Deferred.
- **Redis or a materialised view** — not needed at current sizes; would hide rather than fix query cost.

## M21 addendum (2026-09-30)

Audit: the dashboard, routes and authorization work; what blocked access was that no `TEACHER` account can
exist without the operator CLI, and none was created on the demo. The procedure is documented in
docs/m21-content-generation.md; the model (operator-managed links) is unchanged. The student detail now shows
whether each recent lesson has its explainer video.
