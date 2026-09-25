import type {
  RosterActivityFilter,
  RosterSortDirection,
  RosterSortField,
  StoredLessonProgressStatus,
} from "@tfm-bic/domain";

/**
 * One of a teacher's students as the roster shows them: teacher-visible profile fields and
 * aggregates of the authoritative per-student records. Never an email, a role, a password hash,
 * a session or a submitted answer.
 */
export interface RosterStudentRecord {
  readonly studentId: string;
  readonly firstName: string | null;
  readonly lastName: string | null;
  readonly nickname: string | null;
  readonly avatarId: string | null;
  /** `lesson_progress` rows with status `completed` (M6). */
  readonly lessonsCompleted: number;
  /** `lesson_progress` rows with status `in_progress` (M6). */
  readonly lessonsInProgress: number;
  /** Every stored `exercise_attempts` row (M7: every well-formed submission is an attempt). */
  readonly exerciseAttempts: number;
  readonly correctAttempts: number;
  /** Sum of the student's `point_transactions` — the same derivation as M8's `loadFacts`. */
  readonly points: number;
  /** Latest of `lesson_progress.updated_at` and `exercise_attempts.answered_at`; `null` if none. */
  readonly lastActivityAt: Date | null;
}

export interface TeacherOverviewTotals {
  readonly totalStudents: number;
  readonly activeStudents: number;
  readonly lessonsCompleted: number;
  readonly exerciseAttempts: number;
  readonly correctAttempts: number;
  readonly points: number;
}

export interface RosterQuery {
  /** Already validated and trimmed; matched as a plain case-insensitive substring of the name. */
  readonly search?: string;
  readonly activity?: RosterActivityFilter;
  /** The start of the "active" window, from the domain's `activeSince(clock.now())`. */
  readonly activeSince: Date;
  readonly sort: RosterSortField;
  readonly direction: RosterSortDirection;
  readonly limit: number;
  readonly offset: number;
}

export interface RosterPage {
  readonly students: readonly RosterStudentRecord[];
  /** How many of the teacher's students match the filters, across all pages. */
  readonly total: number;
}

export interface StudentLessonRecord {
  readonly lessonId: string;
  readonly status: StoredLessonProgressStatus;
  readonly startedAt: Date;
  readonly completedAt: Date | null;
  readonly updatedAt: Date;
}

export interface StudentAttemptRecord {
  readonly exerciseId: string;
  readonly correct: boolean;
  readonly answeredAt: Date;
}

export interface WeeklyActivityRecord {
  /** Monday 00:00 UTC. Weeks with no activity are absent; the use case fills them in. */
  readonly weekStart: Date;
  readonly lessonsCompleted: number;
  readonly exerciseAttempts: number;
  readonly correctAttempts: number;
  readonly points: number;
}

export interface StudentActivityRecord {
  readonly student: RosterStudentRecord;
  /** Every lesson the student has started, in no guaranteed order. */
  readonly lessons: readonly StudentLessonRecord[];
  /** Distinct exercises with at least one attempt. */
  readonly exercisesAttempted: number;
  /** Distinct exercises whose latest attempt (M7's definition of "latest") is correct. */
  readonly exercisesLatestCorrect: number;
  /** The most recent attempts, newest first — verdict and time only, never the answer. */
  readonly recentAttempts: readonly StudentAttemptRecord[];
  readonly weekly: readonly WeeklyActivityRecord[];
}

export interface StudentActivityQuery {
  /** Weekly buckets start at this Monday 00:00 UTC. */
  readonly weeklyFrom: Date;
  readonly recentAttemptLimit: number;
}

/**
 * The teacher dashboard's read model: grouped queries over the authoritative M4/M6/M7/M8 tables,
 * **always scoped by the teacher** — every query joins through `teacher_students` on the given
 * teacher id, so a student outside the teacher's links is never read, whatever id is passed.
 * The cost of a query does not grow with the number of students on a page (no per-student
 * query). Read-only: nothing here writes.
 */
export interface TeacherDashboardReadModel {
  overview(teacherId: string, activeSince: Date): Promise<TeacherOverviewTotals>;
  listStudents(teacherId: string, query: RosterQuery): Promise<RosterPage>;
  /** `null` when the student is not linked to this teacher (or does not exist, or is not a student). */
  studentActivity(
    teacherId: string,
    studentId: string,
    query: StudentActivityQuery,
  ): Promise<StudentActivityRecord | null>;
}
