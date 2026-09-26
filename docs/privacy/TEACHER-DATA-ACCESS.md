# Teacher data access

Status: LIVE — verified against the M13 implementation on 2026-09-26. Not legal advice — see the
[disclaimer](README.md). Design detail: [teacher-dashboard.md](../architecture/teacher-dashboard.md),
[ADR-024](../adr/adr-024-teacher-dashboard.md).

## Relationship model

- One row per `(teacher_id, student_id)` in `teacher_students`. No schools, classes or invitations.
- Links and the TEACHER role are created **only by operators** (`pnpm --filter @tfm-bic/data teacher:admin`, or the
  `NODE_ENV=test`-only E2E route). No production route creates a link or changes a role.
- A student is not told which teacher is linked, and does not consent to the link in the app — **PENDING
  product/legal decision** (M13 open question). The M15 export tells a student _that_ and _when_ a teacher was
  linked, not who (the teacher's identity is another person's data; disclosing it is part of that same decision).

## What a teacher can see (linked students only)

| Visible                                                                                    | Source                                    |
| ------------------------------------------------------------------------------------------ | ----------------------------------------- |
| First name, last name, nickname, avatar id                                                 | `student_profiles`                        |
| `studentId` (to open the detail page)                                                      | `users.id`                                |
| Lessons completed / in progress, per level, recent lessons (title, status, dates)          | `lesson_progress` + catalog               |
| Exercise attempt counts, accuracy, recent verdicts (correct/incorrect, time, lesson title) | `exercise_attempts` (never the answer)    |
| Points total, weekly activity, unlocked achievements                                       | `point_transactions`, `user_achievements` |
| Active / inactive (activity in the last 7 days)                                            | derived                                   |

## What a teacher can never see

Email address, role, password hash, sessions, tokens, email-verification state, account timestamps, **submitted
answers**, vocabulary progress, phonetics progress, video jobs, email/newsletter preferences, the export, any
privacy or security event, any student who is not linked to them.

## How it is enforced

| Control                                         | Where                                                                                                 |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Authentication, then `requireRole(["TEACHER"])` | Route hooks; the use cases check the role again                                                       |
| Teacher id only from the session                | No teacher id in any path, query or body                                                              |
| Roster CTE is the authorisation boundary        | Every SQL statement starts from `teacher_students` for the session's teacher and role `STUDENT`       |
| IDOR-safe single not-found                      | Another teacher's student, a missing id, a non-student and a malformed id are the same `404`          |
| Allowlisted responses                           | Zod response schemas without email/role/answers; the read model never selects them                    |
| Student cannot reach teacher routes             | `403` for non-teachers; a student cannot read another student's data anywhere (session-scoped routes) |
| Audit log                                       | `teacher.student_viewed` with `teacherId` and `studentId` only                                        |

## Effect of account deletion (M15)

- **Student deletes their account:** their link rows go in the same transaction; they disappear from the roster and
  their detail page is the standard `404` (E2E: `privacy-data-management.spec.ts`).
- **Teacher deletes their account:** their links go; the students' own data is untouched (data test:
  `account-erasure.store.test.ts`).

## Tests

- M13: `teacher-dashboard.use-cases.test.ts`, `teacher-dashboard.read-model.test.ts` (cross-teacher isolation,
  statement counts), `teacher-dashboard.route.test.ts` (role, `404` parity), `teacher-dashboard.spec.ts` (E2E
  cross-teacher refusal).
- M15: `privacy-data-management.spec.ts` — teacher A gets `404` for teacher B's student, and loses a student who
  deleted their account.
