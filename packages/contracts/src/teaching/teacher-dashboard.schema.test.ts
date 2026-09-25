import { describe, expect, it } from "vitest";

import {
  teacherDashboardEmptyQuerySchema,
  teacherOverviewResponseSchema,
  teacherStudentDetailResponseSchema,
  teacherStudentIdParamSchema,
  teacherStudentListQuerySchema,
  teacherStudentsResponseSchema,
} from "./teacher-dashboard.schema.js";

const STUDENT = {
  studentId: "7d9f1c1e-2f0a-4c55-9d0e-3d9b8f6a1b2c",
  displayName: "Ana Nowak",
  nickname: "ana",
  avatarId: "avatar-01",
  lessonsCompleted: 2,
  lessonsInProgress: 1,
  exerciseAttempts: 4,
  accuracyPercent: 75,
  points: 120,
  lastActivityAt: "2026-09-24T10:00:00.000Z",
  active: true,
};

describe("teacherStudentListQuerySchema", () => {
  it("applies defaults: page 1, 20 per page, no filters", () => {
    expect(teacherStudentListQuerySchema.parse({})).toEqual({ page: 1, pageSize: 20 });
  });

  it("accepts every documented filter and sort", () => {
    expect(
      teacherStudentListQuerySchema.parse({
        q: "  Ana ",
        activity: "inactive",
        sort: "accuracy",
        direction: "asc",
        page: "3",
        pageSize: "50",
      }),
    ).toEqual({
      q: "Ana",
      activity: "inactive",
      sort: "accuracy",
      direction: "asc",
      page: 3,
      pageSize: 50,
    });
  });

  it.each<[Record<string, string>, string]>([
    [{ pageSize: "51" }, "a page size above the server maximum"],
    [{ pageSize: "0" }, "a zero page size"],
    [{ pageSize: "1e2" }, "a number in exponent notation"],
    [{ page: "1001" }, "a page beyond the ceiling"],
    [{ page: "-1" }, "a negative page"],
    [{ sort: "password_hash" }, "a column that is not on the allowlist"],
    [{ sort: "points; DROP TABLE users" }, "an injection attempt as a sort"],
    [{ direction: "sideways" }, "an unknown direction"],
    [{ activity: "sleeping" }, "an unknown activity filter"],
    [{ q: "" }, "an empty search"],
    [{ q: "   " }, "a blank search"],
    [{ q: "x".repeat(51) }, "an overlong search"],
    [{ q: "a\u0000b" }, "a control character in the search"],
    [{ teacherId: "someone-else" }, "a client-supplied teacher id"],
    [{ limit: "10" }, "an undocumented key"],
  ])("rejects %j (%s)", (query) => {
    expect(teacherStudentListQuerySchema.safeParse(query).success).toBe(false);
  });
});

describe("teacherDashboardEmptyQuerySchema", () => {
  it("accepts no query, and refuses any key (e.g. a teacher id)", () => {
    expect(teacherDashboardEmptyQuerySchema.safeParse({}).success).toBe(true);
    expect(teacherDashboardEmptyQuerySchema.safeParse({ teacherId: "x" }).success).toBe(false);
  });
});

describe("teacherStudentIdParamSchema", () => {
  it("accepts a UUID and nothing else", () => {
    expect(teacherStudentIdParamSchema.safeParse({ studentId: STUDENT.studentId }).success).toBe(
      true,
    );
    for (const bad of ["1", "../admin", "7d9f1c1e", "' OR 1=1 --"]) {
      expect(teacherStudentIdParamSchema.safeParse({ studentId: bad }).success).toBe(false);
    }
  });
});

describe("response schemas are allowlists", () => {
  it("strips anything not named — an email or a role can never reach a client", () => {
    const parsed = teacherStudentsResponseSchema.parse({
      students: [{ ...STUDENT, email: "ana@example.com", role: "STUDENT", passwordHash: "x" }],
      page: 1,
      pageSize: 20,
      total: 1,
      totalPages: 1,
      sort: { field: "name", direction: "asc" },
    });
    expect(parsed.students[0]).toEqual(STUDENT);
  });

  it("describes the overview", () => {
    const overview = {
      totalStudents: 2,
      activeStudents: 1,
      inactiveStudents: 1,
      activeWindowDays: 7,
      lessonsCompleted: 3,
      exerciseAttempts: 4,
      accuracyPercent: null,
      points: 0,
    };
    expect(teacherOverviewResponseSchema.parse(overview)).toEqual(overview);
  });

  it("describes a student detail, without any submitted answer", () => {
    const detail = {
      student: STUDENT,
      lessons: {
        byLevel: [
          { languageId: "pl", levelId: "a1", completed: 1, inProgress: 1, publishedLessons: 4 },
        ],
        unmatched: 0,
        recent: [
          {
            lessonId: "pl-first",
            title: "Greetings",
            languageId: "pl",
            levelId: "a1",
            status: "completed",
            startedAt: "2026-09-20T10:00:00.000Z",
            completedAt: "2026-09-21T10:00:00.000Z",
            updatedAt: "2026-09-21T10:00:00.000Z",
          },
        ],
      },
      exercises: {
        attempts: 4,
        correctAttempts: 3,
        incorrectAttempts: 1,
        accuracyPercent: 75,
        exercisesAttempted: 2,
        exercisesLatestCorrect: 1,
        recent: [
          {
            exerciseId: "pl-first-tf",
            lessonId: "pl-first",
            lessonTitle: "Greetings",
            correct: true,
            answeredAt: "2026-09-21T10:00:00.000Z",
            submittedAnswer: "leaked",
          },
        ],
      },
      gamification: {
        totalPoints: 30,
        achievements: { unlockedCount: 1, totalCount: 5 },
        unlocked: [
          {
            key: "first-exercise",
            title: "First exercise",
            iconId: "spark",
            unlockedAt: "2026-09-21T10:00:00.000Z",
          },
        ],
      },
      weekly: [
        {
          weekStart: "2026-09-21T00:00:00.000Z",
          lessonsCompleted: 1,
          exerciseAttempts: 4,
          correctAttempts: 3,
          accuracyPercent: 75,
          points: 30,
        },
      ],
    };
    const parsed = teacherStudentDetailResponseSchema.parse(detail);
    expect(parsed.exercises.recent[0]).not.toHaveProperty("submittedAnswer");
  });

  it("refuses an accuracy outside 0–100", () => {
    expect(
      teacherStudentsResponseSchema.safeParse({
        students: [{ ...STUDENT, accuracyPercent: 101 }],
        page: 1,
        pageSize: 20,
        total: 1,
        totalPages: 1,
        sort: { field: "name", direction: "asc" },
      }).success,
    ).toBe(false);
  });
});
