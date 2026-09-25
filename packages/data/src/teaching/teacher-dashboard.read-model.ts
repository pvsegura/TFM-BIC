import type {
  RosterPage,
  RosterQuery,
  RosterStudentRecord,
  StudentActivityQuery,
  StudentActivityRecord,
  StudentAttemptRecord,
  StudentLessonRecord,
  TeacherDashboardReadModel,
  TeacherOverviewTotals,
  WeeklyActivityRecord,
} from "@tfm-bic/application";
import type { RosterSortDirection, RosterSortField } from "@tfm-bic/domain";
import { sql, type SQL } from "drizzle-orm";

import type { TeachingDb } from "./db/client.js";

type Row = Record<string, unknown>;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * The only SQL a sort field can ever become. A client-supplied value selects one of these
 * fixed expressions (the contract has already restricted it to `ROSTER_SORT_FIELDS`); it is
 * never itself put into the query.
 */
const SORT_EXPRESSIONS: Record<RosterSortField, SQL> = {
  name: sql.raw("lower(display_name)"),
  lastActivity: sql.raw("last_activity_at"),
  points: sql.raw("points"),
  lessonsCompleted: sql.raw("lessons_completed"),
  accuracy: sql.raw(
    "CASE WHEN exercise_attempts = 0 THEN NULL ELSE correct_attempts::float8 / exercise_attempts END",
  ),
};

const SORT_DIRECTIONS: Record<RosterSortDirection, SQL> = {
  asc: sql.raw("ASC"),
  desc: sql.raw("DESC"),
};

/** Counts are cast to `int` and sums to `float8` in SQL, so both drivers hand back JS numbers. */
const num = (value: unknown): number => Number(value ?? 0);
const date = (value: unknown): Date =>
  value instanceof Date ? value : new Date(value as string | number);
const dateOrNull = (value: unknown): Date | null =>
  value === null || value === undefined ? null : date(value);
/** Text columns only: the driver returns them as strings (or null), never as objects. */
const textOrNull = (value: unknown): string | null => (typeof value === "string" ? value : null);
const iso = (value: Date) => value.toISOString();

/**
 * One row per student of the teacher, with their M4 profile fields and grouped M6/M7/M8
 * aggregates. The roster CTE is the authorisation boundary: it starts from `teacher_students`
 * for *this* teacher and keeps only users whose role is still STUDENT; every other CTE is
 * restricted to that roster (`user_id IN (SELECT student_id FROM roster)`) and served by the
 * `user_id`-leading index each table already has. Each table is scanned once per query,
 * whatever the number of students.
 *
 * - points  = sum of `point_transactions.amount` — M8's own derivation of a total (`loadFacts`).
 * - last activity = latest of `lesson_progress.updated_at` and `exercise_attempts.answered_at`
 *   (`greatest` ignores NULLs in Postgres).
 */
function studentRowsCte(teacherId: string, onlyStudentId?: string): SQL {
  const onlyStudent =
    onlyStudentId === undefined ? sql`` : sql`AND ts.student_id = ${onlyStudentId}::uuid`;
  return sql`
    roster AS (
      SELECT u.id AS student_id, p.first_name, p.last_name, p.nickname, p.avatar_id,
             coalesce(nullif(concat_ws(' ', p.first_name, p.last_name), ''), p.nickname) AS display_name
      FROM teacher_students ts
      JOIN users u ON u.id = ts.student_id AND u.role = 'STUDENT'
      LEFT JOIN student_profiles p ON p.user_id = u.id
      WHERE ts.teacher_id = ${teacherId}::uuid ${onlyStudent}
    ),
    lessons AS (
      SELECT lp.user_id,
             count(*) FILTER (WHERE lp.status = 'completed')::int AS completed,
             count(*) FILTER (WHERE lp.status = 'in_progress')::int AS in_progress,
             max(lp.updated_at) AS last_at
      FROM lesson_progress lp
      WHERE lp.user_id IN (SELECT student_id FROM roster)
      GROUP BY lp.user_id
    ),
    attempts AS (
      SELECT ea.user_id, count(*)::int AS attempts,
             count(*) FILTER (WHERE ea.correct)::int AS correct,
             max(ea.answered_at) AS last_at
      FROM exercise_attempts ea
      WHERE ea.user_id IN (SELECT student_id FROM roster)
      GROUP BY ea.user_id
    ),
    ledger AS (
      SELECT pt.user_id, sum(pt.amount)::float8 AS points
      FROM point_transactions pt
      WHERE pt.user_id IN (SELECT student_id FROM roster)
      GROUP BY pt.user_id
    ),
    student_rows AS (
      SELECT r.student_id, r.first_name, r.last_name, r.nickname, r.avatar_id, r.display_name,
             coalesce(l.completed, 0) AS lessons_completed,
             coalesce(l.in_progress, 0) AS lessons_in_progress,
             coalesce(a.attempts, 0) AS exercise_attempts,
             coalesce(a.correct, 0) AS correct_attempts,
             coalesce(g.points, 0) AS points,
             greatest(l.last_at, a.last_at) AS last_activity_at
      FROM roster r
      LEFT JOIN lessons l ON l.user_id = r.student_id
      LEFT JOIN attempts a ON a.user_id = r.student_id
      LEFT JOIN ledger g ON g.user_id = r.student_id
    )`;
}

function toStudentRecord(row: Row): RosterStudentRecord {
  return {
    studentId: String(row.student_id),
    firstName: textOrNull(row.first_name),
    lastName: textOrNull(row.last_name),
    nickname: textOrNull(row.nickname),
    avatarId: textOrNull(row.avatar_id),
    lessonsCompleted: num(row.lessons_completed),
    lessonsInProgress: num(row.lessons_in_progress),
    exerciseAttempts: num(row.exercise_attempts),
    correctAttempts: num(row.correct_attempts),
    points: num(row.points),
    lastActivityAt: dateOrNull(row.last_activity_at),
  };
}

function rosterFilters(query: RosterQuery): SQL {
  const conditions: SQL[] = [sql`TRUE`];
  if (query.search !== undefined) {
    // A plain substring test: `strpos`, not LIKE/regex, so "%" or "_" in a search are just
    // characters and the term is only ever a bound parameter.
    conditions.push(
      sql`strpos(lower(concat_ws(' ', display_name, nickname)), lower(${query.search})) > 0`,
    );
  }
  if (query.activity === "active") {
    conditions.push(sql`last_activity_at >= ${iso(query.activeSince)}::timestamptz`);
  } else if (query.activity === "inactive") {
    conditions.push(
      sql`(last_activity_at IS NULL OR last_activity_at < ${iso(query.activeSince)}::timestamptz)`,
    );
  }
  return sql.join(conditions, sql` AND `);
}

/**
 * The teacher dashboard's read model (ADR-024): a small, fixed number of grouped SQL statements
 * per screen, never one per student. Read-only; it reads the tables of Profile, Lessons,
 * Exercises and Gamification but writes none of them, and it decides no business rule — the
 * definitions (active, accuracy, "latest") are the domain's and M7's.
 */
export class DrizzleTeacherDashboardReadModel implements TeacherDashboardReadModel {
  constructor(private readonly db: TeachingDb) {}

  private async rows(query: SQL): Promise<Row[]> {
    const result = await this.db.execute(query);
    return result.rows;
  }

  async overview(teacherId: string, activeSince: Date): Promise<TeacherOverviewTotals> {
    const [row = {}] = await this.rows(sql`
      WITH ${studentRowsCte(teacherId)}
      SELECT count(*)::int AS total_students,
             count(*) FILTER (WHERE last_activity_at >= ${iso(activeSince)}::timestamptz)::int AS active_students,
             coalesce(sum(lessons_completed), 0)::int AS lessons_completed,
             coalesce(sum(exercise_attempts), 0)::int AS exercise_attempts,
             coalesce(sum(correct_attempts), 0)::int AS correct_attempts,
             coalesce(sum(points), 0)::float8 AS points
      FROM student_rows`);
    return {
      totalStudents: num(row.total_students),
      activeStudents: num(row.active_students),
      lessonsCompleted: num(row.lessons_completed),
      exerciseAttempts: num(row.exercise_attempts),
      correctAttempts: num(row.correct_attempts),
      points: num(row.points),
    };
  }

  async listStudents(teacherId: string, query: RosterQuery): Promise<RosterPage> {
    // One statement: the page and the total of the filtered roster. The page is RIGHT JOINed to
    // a single row so the total comes back even when the page is past the end.
    const rows = await this.rows(sql`
      WITH ${studentRowsCte(teacherId)},
      filtered AS (SELECT * FROM student_rows WHERE ${rosterFilters(query)}),
      page AS (
        SELECT * FROM filtered
        ORDER BY ${SORT_EXPRESSIONS[query.sort]} ${SORT_DIRECTIONS[query.direction]} NULLS LAST,
                 student_id ASC
        LIMIT ${query.limit} OFFSET ${query.offset}
      )
      SELECT (SELECT count(*)::int FROM filtered) AS total, page.*
      FROM page RIGHT JOIN (SELECT 1) AS one ON TRUE
      ORDER BY ${SORT_EXPRESSIONS[query.sort]} ${SORT_DIRECTIONS[query.direction]} NULLS LAST,
               page.student_id ASC`);

    return {
      total: num(rows[0]?.total),
      students: rows.filter((row) => row.student_id != null).map(toStudentRecord),
    };
  }

  async studentActivity(
    teacherId: string,
    studentId: string,
    query: StudentActivityQuery,
  ): Promise<StudentActivityRecord | null> {
    if (!UUID_PATTERN.test(studentId)) {
      return null;
    }
    // Authorise and load in one statement: the row exists only if this teacher is linked.
    const [studentRow] = await this.rows(sql`
      WITH ${studentRowsCte(teacherId, studentId)}
      SELECT * FROM student_rows`);
    if (!studentRow) {
      return null;
    }

    // From here on the student is known to be this teacher's.
    const from = iso(query.weeklyFrom);
    const [lessonRows, standingRows, attemptRows, weeklyRows] = await Promise.all([
      this.rows(sql`
        SELECT lesson_id, status, started_at, completed_at, updated_at
        FROM lesson_progress WHERE user_id = ${studentId}::uuid`),
      // M7's "latest": greatest answered_at, ties by the greater id (see summarizeAttempts).
      this.rows(sql`
        SELECT count(*)::int AS attempted, count(*) FILTER (WHERE correct)::int AS latest_correct
        FROM (
          SELECT DISTINCT ON (exercise_id) exercise_id, correct
          FROM exercise_attempts WHERE user_id = ${studentId}::uuid
          ORDER BY exercise_id, answered_at DESC, id DESC
        ) AS latest`),
      // Verdict and time only — the submitted answer is never selected.
      this.rows(sql`
        SELECT exercise_id, correct, answered_at
        FROM exercise_attempts WHERE user_id = ${studentId}::uuid
        ORDER BY answered_at DESC, id DESC
        LIMIT ${query.recentAttemptLimit}`),
      // Weeks are ISO weeks in UTC: date_trunc('week') of the UTC wall-clock time is its Monday.
      this.rows(sql`
        SELECT (week AT TIME ZONE 'UTC') AS week_start,
               sum(lessons)::int AS lessons_completed, sum(attempts)::int AS exercise_attempts,
               sum(correct)::int AS correct_attempts, sum(points)::float8 AS points
        FROM (
          SELECT date_trunc('week', completed_at AT TIME ZONE 'UTC') AS week, 1 AS lessons, 0 AS attempts, 0 AS correct, 0 AS points
          FROM lesson_progress
          WHERE user_id = ${studentId}::uuid AND completed_at >= ${from}::timestamptz
          UNION ALL
          SELECT date_trunc('week', answered_at AT TIME ZONE 'UTC'), 0, 1, CASE WHEN correct THEN 1 ELSE 0 END, 0
          FROM exercise_attempts
          WHERE user_id = ${studentId}::uuid AND answered_at >= ${from}::timestamptz
          UNION ALL
          SELECT date_trunc('week', created_at AT TIME ZONE 'UTC'), 0, 0, 0, amount
          FROM point_transactions
          WHERE user_id = ${studentId}::uuid AND created_at >= ${from}::timestamptz
        ) AS events
        GROUP BY week
        ORDER BY week`),
    ]);

    const [standing = {}] = standingRows;
    return {
      student: toStudentRecord(studentRow),
      lessons: lessonRows.map((row): StudentLessonRecord => ({
        lessonId: String(row.lesson_id),
        status: row.status === "completed" ? "completed" : "in_progress",
        startedAt: date(row.started_at),
        completedAt: dateOrNull(row.completed_at),
        updatedAt: date(row.updated_at),
      })),
      exercisesAttempted: num(standing.attempted),
      exercisesLatestCorrect: num(standing.latest_correct),
      recentAttempts: attemptRows.map((row): StudentAttemptRecord => ({
        exerciseId: String(row.exercise_id),
        correct: row.correct === true,
        answeredAt: date(row.answered_at),
      })),
      weekly: weeklyRows.map((row): WeeklyActivityRecord => ({
        weekStart: date(row.week_start),
        lessonsCompleted: num(row.lessons_completed),
        exerciseAttempts: num(row.exercise_attempts),
        correctAttempts: num(row.correct_attempts),
        points: num(row.points),
      })),
    };
  }
}
