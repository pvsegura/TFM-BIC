import type {
  RosterPage,
  RosterQuery,
  RosterStudentRecord,
  StudentActivityQuery,
  StudentActivityRecord,
  TeacherDashboardReadModel,
  TeacherOverviewTotals,
} from "../ports/teacher-dashboard-read-model.js";
import type { TeacherStudentLinkRepository } from "../ports/teacher-student-link-repository.js";

export interface FakeLink {
  teacherId: string;
  studentId: string;
  linkedAt: Date;
}

/** In-memory links. Test-only. */
export class FakeTeacherStudentLinkRepository implements TeacherStudentLinkRepository {
  readonly links: FakeLink[] = [];

  link(teacherId: string, studentId: string, now: Date): Promise<boolean> {
    if (this.has(teacherId, studentId)) {
      return Promise.resolve(false);
    }
    this.links.push({ teacherId, studentId, linkedAt: now });
    return Promise.resolve(true);
  }

  unlink(teacherId: string, studentId: string): Promise<boolean> {
    const index = this.links.findIndex(
      (l) => l.teacherId === teacherId && l.studentId === studentId,
    );
    if (index === -1) {
      return Promise.resolve(false);
    }
    this.links.splice(index, 1);
    return Promise.resolve(true);
  }

  isLinkedAsStudent(userId: string): Promise<boolean> {
    return Promise.resolve(this.links.some((l) => l.studentId === userId));
  }

  has(teacherId: string, studentId: string): boolean {
    return this.links.some((l) => l.teacherId === teacherId && l.studentId === studentId);
  }
}

export function makeRosterStudent(
  studentId: string,
  overrides: Partial<RosterStudentRecord> = {},
): RosterStudentRecord {
  return {
    studentId,
    firstName: null,
    lastName: null,
    nickname: null,
    avatarId: null,
    lessonsCompleted: 0,
    lessonsInProgress: 0,
    exerciseAttempts: 0,
    correctAttempts: 0,
    points: 0,
    lastActivityAt: null,
    ...overrides,
  };
}

type ActivityDetail = Omit<StudentActivityRecord, "student">;

const EMPTY_ACTIVITY: ActivityDetail = {
  lessons: [],
  exercisesAttempted: 0,
  exercisesLatestCorrect: 0,
  recentAttempts: [],
  weekly: [],
};

function nameOf(s: RosterStudentRecord): string {
  return s.nickname ?? [s.firstName, s.lastName].filter((p) => p !== null).join(" ");
}

function sortValue(s: RosterStudentRecord, field: RosterQuery["sort"]): number | string | null {
  switch (field) {
    case "name":
      return nameOf(s).toLowerCase() || null;
    case "lastActivity":
      return s.lastActivityAt?.getTime() ?? null;
    case "points":
      return s.points;
    case "lessonsCompleted":
      return s.lessonsCompleted;
    case "accuracy":
      return s.exerciseAttempts === 0 ? null : s.correctAttempts / s.exerciseAttempts;
  }
}

/**
 * In-memory read model over seeded per-student records, **scoped through the fake links** exactly
 * like the SQL one: a student not linked to the teacher is never returned. Its ordering mirrors
 * the documented SQL ordering (nulls last, ties by student id); the SQL itself is proven in
 * packages/data. `calls` lets a test prove how many reads a screen cost. Test-only.
 */
export class FakeTeacherDashboardReadModel implements TeacherDashboardReadModel {
  readonly records = new Map<string, RosterStudentRecord>();
  readonly activities = new Map<string, ActivityDetail>();
  readonly calls: { method: string; teacherId: string }[] = [];

  constructor(private readonly links: FakeTeacherStudentLinkRepository) {}

  seedStudent(record: RosterStudentRecord, activity: Partial<ActivityDetail> = {}): void {
    this.records.set(record.studentId, record);
    this.activities.set(record.studentId, { ...EMPTY_ACTIVITY, ...activity });
  }

  private rosterOf(teacherId: string): RosterStudentRecord[] {
    return this.links.links
      .filter((l) => l.teacherId === teacherId)
      .map((l) => this.records.get(l.studentId))
      .filter((r): r is RosterStudentRecord => r !== undefined);
  }

  overview(teacherId: string, activeSince: Date): Promise<TeacherOverviewTotals> {
    this.calls.push({ method: "overview", teacherId });
    const roster = this.rosterOf(teacherId);
    const sum = (pick: (r: RosterStudentRecord) => number) =>
      roster.reduce((total, r) => total + pick(r), 0);
    return Promise.resolve({
      totalStudents: roster.length,
      activeStudents: roster.filter(
        (r) => r.lastActivityAt !== null && r.lastActivityAt >= activeSince,
      ).length,
      lessonsCompleted: sum((r) => r.lessonsCompleted),
      exerciseAttempts: sum((r) => r.exerciseAttempts),
      correctAttempts: sum((r) => r.correctAttempts),
      points: sum((r) => r.points),
    });
  }

  listStudents(teacherId: string, query: RosterQuery): Promise<RosterPage> {
    this.calls.push({ method: "listStudents", teacherId });
    const search = query.search?.toLowerCase();
    const matching = this.rosterOf(teacherId)
      .filter((r) => search === undefined || nameOf(r).toLowerCase().includes(search))
      .filter((r) => {
        if (query.activity === undefined) {
          return true;
        }
        const active = r.lastActivityAt !== null && r.lastActivityAt >= query.activeSince;
        return query.activity === "active" ? active : !active;
      })
      .sort((a, b) => {
        const va = sortValue(a, query.sort);
        const vb = sortValue(b, query.sort);
        if (va === vb) {
          return a.studentId < b.studentId ? -1 : 1;
        }
        if (va === null) {
          return 1;
        }
        if (vb === null) {
          return -1;
        }
        const order = va < vb ? -1 : 1;
        return query.direction === "asc" ? order : -order;
      });
    return Promise.resolve({
      students: matching.slice(query.offset, query.offset + query.limit),
      total: matching.length,
    });
  }

  studentActivity(
    teacherId: string,
    studentId: string,
    query: StudentActivityQuery,
  ): Promise<StudentActivityRecord | null> {
    this.calls.push({ method: "studentActivity", teacherId });
    const student = this.links.has(teacherId, studentId) ? this.records.get(studentId) : undefined;
    if (student === undefined) {
      return Promise.resolve(null);
    }
    const activity = this.activities.get(studentId) ?? EMPTY_ACTIVITY;
    return Promise.resolve({
      student,
      ...activity,
      recentAttempts: activity.recentAttempts.slice(0, query.recentAttemptLimit),
      weekly: activity.weekly.filter((w) => w.weekStart >= query.weeklyFrom),
    });
  }
}
