import type { RosterQuery } from "@tfm-bic/application";
import { sql } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import {
  createGamificationTestDb,
  type GamificationTestDbHandle,
} from "../gamification/db/test-support/create-test-db.js";
import { DrizzleGamificationRepository } from "../gamification/gamification.repository.js";
import { DrizzleTeacherDashboardReadModel } from "./teacher-dashboard.read-model.js";
import { DrizzleTeacherStudentLinkRepository } from "./teacher-student-link.repository.js";

const NOW = new Date("2026-09-25T10:00:00.000Z");
const SINCE = new Date("2026-09-18T10:00:00.000Z"); // NOW - 7 days
const at = (iso: string) => new Date(iso);
const daysAgo = (days: number) => new Date(NOW.getTime() - days * 86_400_000);

let handle: GamificationTestDbHandle;
let readModel: DrizzleTeacherDashboardReadModel;
let links: DrizzleTeacherStudentLinkRepository;

beforeAll(async () => {
  handle = await createGamificationTestDb();
  readModel = new DrizzleTeacherDashboardReadModel(handle.teachingDb);
  links = new DrizzleTeacherStudentLinkRepository(handle.teachingDb);
});

afterAll(async () => {
  await handle.close();
});

beforeEach(async () => {
  await handle.reset();
});

// --- seeding helpers: raw inserts into the authoritative tables of M4/M6/M7/M8 ---

async function profile(
  userId: string,
  p: { first?: string; last?: string; nickname?: string; avatar?: string },
) {
  await handle.rawExecute(sql`
    INSERT INTO student_profiles (user_id, first_name, last_name, nickname, avatar_id)
    VALUES (${userId}, ${p.first ?? null}, ${p.last ?? null}, ${p.nickname ?? null}, ${p.avatar ?? null})`);
}

async function lesson(
  userId: string,
  lessonId: string,
  status: "in_progress" | "completed",
  startedAt: Date,
  completedAt: Date | null = null,
) {
  const updatedAt = completedAt ?? startedAt;
  await handle.rawExecute(sql`
    INSERT INTO lesson_progress (user_id, lesson_id, status, started_at, completed_at, updated_at)
    VALUES (${userId}, ${lessonId}, ${status}, ${startedAt.toISOString()}, ${completedAt?.toISOString() ?? null}, ${updatedAt.toISOString()})`);
}

async function attempt(userId: string, exerciseId: string, correct: boolean, answeredAt: Date) {
  await handle.rawExecute(sql`
    INSERT INTO exercise_attempts (user_id, exercise_id, submitted_answer, correct, answered_at)
    VALUES (${userId}, ${exerciseId}, ${JSON.stringify("secret-answer")}::jsonb, ${correct}, ${answeredAt.toISOString()})`);
}

async function points(userId: string, sourceId: string, amount: number, createdAt: Date) {
  await handle.rawExecute(sql`
    INSERT INTO point_transactions (user_id, reason, source_id, amount, created_at)
    VALUES (${userId}, 'exercise-completed', ${sourceId}, ${amount}, ${createdAt.toISOString()})`);
}

const query = (overrides: Partial<RosterQuery> = {}): RosterQuery => ({
  activeSince: SINCE,
  sort: "name",
  direction: "asc",
  limit: 20,
  offset: 0,
  ...overrides,
});

/** Teacher A: Ana (active, busy), Bo (inactive, old activity), Ce (no activity, no profile).
 * Teacher B: Di. Also a stray student linked to nobody. */
async function seedClass() {
  const teacherA = await handle.seedUser("a@example.com", "TEACHER");
  const teacherB = await handle.seedUser("b@example.com", "TEACHER");
  const ana = await handle.seedUser("ana@example.com");
  const bo = await handle.seedUser("bo@example.com");
  const ce = await handle.seedUser("ce@example.com");
  const di = await handle.seedUser("di@example.com");
  const stray = await handle.seedUser("stray@example.com");

  await profile(ana, { first: "Ana", last: "Nowak", nickname: "anan", avatar: "fox" });
  await profile(bo, { nickname: "bo_50%" });
  await profile(di, { first: "Di" });

  await lesson(ana, "pl-first", "completed", daysAgo(3), daysAgo(2));
  await lesson(ana, "pl-second", "in_progress", daysAgo(1));
  await lesson(bo, "pl-first", "completed", daysAgo(40), daysAgo(40));

  // Ana: ex1 wrong then right (latest correct), ex2 right then wrong (latest wrong) → 4 attempts, 2 correct.
  await attempt(ana, "pl-ex1", false, daysAgo(2));
  await attempt(ana, "pl-ex1", true, daysAgo(1.5));
  await attempt(ana, "pl-ex2", true, daysAgo(1.2));
  await attempt(ana, "pl-ex2", false, daysAgo(1));
  await attempt(bo, "pl-ex1", true, daysAgo(40));
  await attempt(di, "pl-ex1", true, daysAgo(0.5));

  await points(ana, "pl-ex1", 10, daysAgo(1.5));
  await points(ana, "pl-ex2", 10, daysAgo(1.2));
  await points(bo, "pl-ex1", 10, daysAgo(40));
  await points(di, "pl-ex1", 500, daysAgo(0.5));

  for (const s of [ana, bo, ce]) {
    await links.link(teacherA, s, NOW);
  }
  await links.link(teacherB, di, NOW);

  return { teacherA, teacherB, ana, bo, ce, di, stray };
}

describe("overview", () => {
  it("aggregates only the teacher's own students", async () => {
    const { teacherA } = await seedClass();

    expect(await readModel.overview(teacherA, SINCE)).toEqual({
      totalStudents: 3,
      activeStudents: 1,
      lessonsCompleted: 2,
      exerciseAttempts: 5,
      correctAttempts: 3,
      points: 30,
    });
  });

  it("is all zeros for a teacher with no students", async () => {
    const lonely = await handle.seedUser("lonely@example.com", "TEACHER");
    expect(await readModel.overview(lonely, SINCE)).toEqual({
      totalStudents: 0,
      activeStudents: 0,
      lessonsCompleted: 0,
      exerciseAttempts: 0,
      correctAttempts: 0,
      points: 0,
    });
  });
});

describe("listStudents", () => {
  it("returns the teacher's students with authoritative aggregates and no private data", async () => {
    const { teacherA, ana } = await seedClass();

    const page = await readModel.listStudents(teacherA, query());

    expect(page.total).toBe(3);
    const first = page.students[0];
    expect(first).toEqual({
      studentId: ana,
      firstName: "Ana",
      lastName: "Nowak",
      nickname: "anan",
      avatarId: "fox",
      lessonsCompleted: 1,
      lessonsInProgress: 1,
      exerciseAttempts: 4,
      correctAttempts: 2,
      points: 20,
      lastActivityAt: daysAgo(1),
    });
    expect(JSON.stringify(page)).not.toMatch(/@example\.com|secret-answer|password/);
  });

  it("never returns another teacher's student or an unlinked one", async () => {
    const { teacherA, teacherB, di, stray } = await seedClass();

    const aIds = (await readModel.listStudents(teacherA, query())).students.map((s) => s.studentId);
    expect(aIds).not.toContain(di);
    expect(aIds).not.toContain(stray);
    const bPage = await readModel.listStudents(teacherB, query());
    expect(bPage.students.map((s) => s.studentId)).toEqual([di]);
  });

  it("drops a linked user who is no longer a student (defence in depth)", async () => {
    const { teacherA, ana } = await seedClass();
    await handle.rawExecute(sql`UPDATE users SET role = 'TEACHER' WHERE id = ${ana}`);

    const ids = (await readModel.listStudents(teacherA, query())).students.map((s) => s.studentId);
    expect(ids).not.toContain(ana);
  });

  it("pages with limit/offset and reports the total across pages, even past the end", async () => {
    const { teacherA } = await seedClass();

    const p1 = await readModel.listStudents(teacherA, query({ limit: 2, offset: 0 }));
    const p2 = await readModel.listStudents(teacherA, query({ limit: 2, offset: 2 }));
    const past = await readModel.listStudents(teacherA, query({ limit: 2, offset: 10 }));

    expect(p1.students).toHaveLength(2);
    expect(p2.students).toHaveLength(1);
    expect(new Set([...p1.students, ...p2.students].map((s) => s.studentId)).size).toBe(3);
    expect([p1.total, p2.total, past.total]).toEqual([3, 3, 3]);
    expect(past.students).toEqual([]);
  });

  it("filters by activity using the given window", async () => {
    const { teacherA, ana, bo, ce } = await seedClass();

    const active = await readModel.listStudents(teacherA, query({ activity: "active" }));
    const inactive = await readModel.listStudents(teacherA, query({ activity: "inactive" }));

    expect(active.students.map((s) => s.studentId)).toEqual([ana]);
    expect(active.total).toBe(1);
    expect(new Set(inactive.students.map((s) => s.studentId))).toEqual(new Set([bo, ce]));
  });

  it("searches names and nicknames as a plain, case-insensitive substring", async () => {
    const { teacherA, ana, bo } = await seedClass();

    const byLast = await readModel.listStudents(teacherA, query({ search: "NOWAK" }));
    const byNick = await readModel.listStudents(teacherA, query({ search: "ana" }));
    expect(byLast.students.map((s) => s.studentId)).toEqual([ana]);
    expect(byNick.students.map((s) => s.studentId)).toEqual([ana]);

    // Wildcard characters are just characters: "%" matches only a literal "%".
    const percent = await readModel.listStudents(teacherA, query({ search: "%" }));
    expect(percent.students.map((s) => s.studentId)).toEqual([bo]);
    const underscore = await readModel.listStudents(teacherA, query({ search: "_" }));
    expect(underscore.students.map((s) => s.studentId)).toEqual([bo]);
    // A would-be injection is only ever a search term.
    const injection = await readModel.listStudents(teacherA, query({ search: "' OR 1=1 --" }));
    expect(injection.students).toEqual([]);
  });

  it("sorts by each allowlisted field, nulls last, ties broken by id", async () => {
    const { teacherA, ana, bo, ce } = await seedClass();
    const order = async (sort: RosterQuery["sort"], direction: RosterQuery["direction"]) =>
      (await readModel.listStudents(teacherA, query({ sort, direction }))).students.map(
        (s) => s.studentId,
      );

    // Display name: "Ana Nowak", "bo_50%", and Ce has none (last).
    expect(await order("name", "asc")).toEqual([ana, bo, ce]);
    expect(await order("name", "desc")).toEqual([bo, ana, ce]);
    expect(await order("lastActivity", "desc")).toEqual([ana, bo, ce]);
    expect(await order("lastActivity", "asc")).toEqual([bo, ana, ce]);
    expect(await order("points", "desc")).toEqual([ana, bo, ce]);
    expect((await order("lessonsCompleted", "desc")).at(-1)).toBe(ce);
    // Accuracy: Bo 100%, Ana 50%, Ce no attempts (null → last in both directions).
    expect(await order("accuracy", "desc")).toEqual([bo, ana, ce]);
    expect(await order("accuracy", "asc")).toEqual([ana, bo, ce]);
  });

  it("breaks ties deterministically by student id", async () => {
    const { teacherA, ana, bo } = await seedClass();
    // Ana and Bo both completed exactly one lesson; Ce none.
    const ids = (
      await readModel.listStudents(teacherA, query({ sort: "lessonsCompleted", direction: "desc" }))
    ).students.map((s) => s.studentId);
    expect(ids.slice(0, 2)).toEqual([ana, bo].sort());
  });

  it("agrees with M8's own ledger derivation of each student's points", async () => {
    const { teacherA } = await seedClass();
    const gamification = new DrizzleGamificationRepository(handle.db);

    for (const s of (await readModel.listStudents(teacherA, query())).students) {
      expect(s.points).toBe((await gamification.loadFacts(s.studentId)).totalPoints);
    }
  });
});

describe("studentActivity", () => {
  const detailQuery = { weeklyFrom: at("2026-08-03T00:00:00.000Z"), recentAttemptLimit: 3 };

  it("is null for another teacher's student, an unlinked user, a missing id or a malformed id", async () => {
    const { teacherA, teacherB, ana, stray } = await seedClass();

    expect(await readModel.studentActivity(teacherB, ana, detailQuery)).toBeNull();
    expect(await readModel.studentActivity(teacherA, stray, detailQuery)).toBeNull();
    expect(
      await readModel.studentActivity(
        teacherA,
        "00000000-0000-4000-8000-000000000000",
        detailQuery,
      ),
    ).toBeNull();
    expect(await readModel.studentActivity(teacherA, "not-a-uuid", detailQuery)).toBeNull();
    expect(await readModel.studentActivity(teacherA, teacherA, detailQuery)).toBeNull();
  });

  it("returns the student's lessons, exercise standing and recent attempts (never answers)", async () => {
    const { teacherA, ana } = await seedClass();

    const result = await readModel.studentActivity(teacherA, ana, detailQuery);

    expect(result?.student.studentId).toBe(ana);
    expect(result?.lessons.map((l) => [l.lessonId, l.status]).sort()).toEqual([
      ["pl-first", "completed"],
      ["pl-second", "in_progress"],
    ]);
    // M7's "latest": ex1 latest correct, ex2 latest wrong.
    expect(result?.exercisesAttempted).toBe(2);
    expect(result?.exercisesLatestCorrect).toBe(1);
    expect(result?.recentAttempts).toEqual([
      { exerciseId: "pl-ex2", correct: false, answeredAt: daysAgo(1) },
      { exerciseId: "pl-ex2", correct: true, answeredAt: daysAgo(1.2) },
      { exerciseId: "pl-ex1", correct: true, answeredAt: daysAgo(1.5) },
    ]);
    expect(JSON.stringify(result)).not.toContain("secret-answer");
  });

  it("buckets activity by UTC week starting Monday, from the requested week on", async () => {
    const { teacherA, ana } = await seedClass();
    // Sunday 23:30 UTC belongs to the week of Monday 2026-09-14; Monday 00:10 UTC to 2026-09-21.
    await attempt(ana, "pl-ex3", true, at("2026-09-20T23:30:00.000Z"));
    await attempt(ana, "pl-ex3", true, at("2026-09-21T00:10:00.000Z"));
    // Before the requested range: ignored.
    await attempt(ana, "pl-ex4", true, at("2026-07-01T00:00:00.000Z"));

    const result = await readModel.studentActivity(teacherA, ana, detailQuery);
    const weeks = Object.fromEntries(
      (result?.weekly ?? []).map((w) => [w.weekStart.toISOString(), w]),
    );

    expect(Object.keys(weeks).sort()).toEqual([
      "2026-09-14T00:00:00.000Z",
      "2026-09-21T00:00:00.000Z",
    ]);
    expect(weeks["2026-09-14T00:00:00.000Z"]).toMatchObject({
      exerciseAttempts: 1,
      correctAttempts: 1,
      lessonsCompleted: 0,
      points: 0,
    });
    expect(weeks["2026-09-21T00:00:00.000Z"]).toMatchObject({
      lessonsCompleted: 1,
      exerciseAttempts: 5,
      correctAttempts: 3,
      points: 20,
    });
  });
});

describe("query cost does not grow with the number of students (no N+1)", () => {
  it("serves a 300-student roster with one statement per list/overview and a fixed number per detail", async () => {
    const teacher = await handle.seedUser("big@example.com", "TEACHER");
    // 300 students, each with 5 lessons, 20 attempts and 10 point transactions (~10 500 rows),
    // inserted in bulk so the fixture itself is not N+1.
    await handle.rawExecute(sql`
      WITH created AS (
        INSERT INTO users (email, normalized_email, password_hash)
        SELECT 'bulk' || g || '@example.com', 'bulk' || g || '@example.com', 'x'
        FROM generate_series(1, 300) AS g
        RETURNING id
      ), linked AS (
        INSERT INTO teacher_students (teacher_id, student_id, linked_at)
        SELECT ${teacher}, id, now() FROM created RETURNING student_id
      ), profiles AS (
        INSERT INTO student_profiles (user_id, nickname)
        SELECT student_id, 'kid-' || substr(student_id::text, 1, 8) FROM linked RETURNING user_id
      ), lessons AS (
        INSERT INTO lesson_progress (user_id, lesson_id, status, started_at, completed_at, updated_at)
        SELECT user_id, 'pl-lesson-' || l, 'completed', now() - interval '3 days', now() - interval '2 days', now() - interval '2 days'
        FROM profiles, generate_series(1, 5) AS l RETURNING user_id
      ), attempts AS (
        INSERT INTO exercise_attempts (user_id, exercise_id, submitted_answer, correct, answered_at)
        SELECT user_id, 'pl-ex-' || (a % 7), '"x"'::jsonb, a % 3 <> 0, now() - (a || ' hours')::interval
        FROM profiles, generate_series(1, 20) AS a RETURNING user_id
      )
      INSERT INTO point_transactions (user_id, reason, source_id, amount, created_at)
      SELECT user_id, 'exercise-completed', 'pl-src-' || p, 10, now() - interval '1 day'
      FROM profiles, generate_series(1, 10) AS p`);

    const execute = vi.spyOn(handle.teachingDb, "execute");

    const overview = await readModel.overview(teacher, SINCE);
    expect(overview.totalStudents).toBe(300);
    expect(execute).toHaveBeenCalledTimes(1);

    execute.mockClear();
    const page = await readModel.listStudents(
      teacher,
      query({ sort: "points", direction: "desc", limit: 50, offset: 100 }),
    );
    expect(page.students).toHaveLength(50);
    expect(page.total).toBe(300);
    expect(page.students[0]?.points).toBe(100);
    expect(execute).toHaveBeenCalledTimes(1);

    execute.mockClear();
    const someone = page.students[0]?.studentId ?? "";
    const detail = await readModel.studentActivity(teacher, someone, {
      weeklyFrom: at("2026-01-05T00:00:00.000Z"),
      recentAttemptLimit: 10,
    });
    expect(detail?.lessons).toHaveLength(5);
    expect(detail?.recentAttempts).toHaveLength(10);
    // One statement to authorise and load the student, then a fixed set for their activity.
    expect(execute.mock.calls.length).toBeLessThanOrEqual(5);
    execute.mockRestore();
  });
});
