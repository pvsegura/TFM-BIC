import {
  createContentId,
  createDefaultAchievementRegistry,
  createExerciseId,
  ForbiddenError,
  TeachingStudentNotFoundError,
  type ContentCatalog,
} from "@tfm-bic/domain";
import { beforeEach, describe, expect, it } from "vitest";

import { FakeContentRepository, makeSampleCatalog } from "../../content/test-support/fakes.js";
import { ListContentUseCase } from "../../content/use-cases/list-content.use-case.js";
import { makeTrueFalseExercise } from "@tfm-bic/domain/testing";
import { FakeExerciseRepository } from "../../exercise/test-support/fakes.js";
import {
  AchievementTexts,
  DEFAULT_ACHIEVEMENT_TEXT_CATALOG,
  DEFAULT_INTERFACE_LOCALE,
} from "../../gamification/achievement-texts.js";
import { FakeGamificationRepository } from "../../gamification/test-support/fakes.js";
import { FixedClock } from "../../identity/test-support/fakes.js";
import {
  FakeTeacherDashboardReadModel,
  FakeTeacherStudentLinkRepository,
  makeRosterStudent,
} from "../test-support/fakes.js";
import { GetTeacherOverviewUseCase } from "./get-teacher-overview.use-case.js";
import { GetTeacherStudentDetailUseCase } from "./get-teacher-student-detail.use-case.js";
import { ListTeacherStudentsUseCase } from "./list-teacher-students.use-case.js";

const NOW = new Date("2026-09-25T10:00:00.000Z");
const TEACHER_A = { id: "teacher-a", role: "TEACHER" as const };
const TEACHER_B = { id: "teacher-b", role: "TEACHER" as const };
const A_STUDENT = { id: "student-x", role: "STUDENT" as const };

const daysAgo = (days: number) => new Date(NOW.getTime() - days * 24 * 60 * 60 * 1000);

function catalog(): ContentCatalog {
  const base = makeSampleCatalog();
  return {
    ...base,
    exercises: [
      makeTrueFalseExercise({
        id: createExerciseId("pl-first-tf"),
        lessonId: createContentId("pl-first"),
      }),
    ],
  };
}

let clock: FixedClock;
let links: FakeTeacherStudentLinkRepository;
let readModel: FakeTeacherDashboardReadModel;
let gamification: FakeGamificationRepository;
let overview: GetTeacherOverviewUseCase;
let list: ListTeacherStudentsUseCase;
let detail: GetTeacherStudentDetailUseCase;

beforeEach(async () => {
  clock = new FixedClock(NOW);
  links = new FakeTeacherStudentLinkRepository();
  readModel = new FakeTeacherDashboardReadModel(links);
  gamification = new FakeGamificationRepository();
  const contentRepository = new FakeContentRepository(catalog());
  const registry = createDefaultAchievementRegistry();
  overview = new GetTeacherOverviewUseCase(readModel, clock);
  list = new ListTeacherStudentsUseCase(readModel, clock);
  detail = new GetTeacherStudentDetailUseCase({
    readModel,
    listContent: new ListContentUseCase(contentRepository),
    contentRepository,
    exerciseRepository: new FakeExerciseRepository([...catalog().exercises]),
    gamificationRepository: gamification,
    achievementRegistry: registry,
    achievementTexts: new AchievementTexts(
      registry,
      DEFAULT_ACHIEVEMENT_TEXT_CATALOG,
      DEFAULT_INTERFACE_LOCALE,
    ),
    clock,
  });

  // Teacher A: Ana (active), Bo (inactive, no activity). Teacher B: Cy.
  readModel.seedStudent(
    makeRosterStudent("s-ana", {
      firstName: "Ana",
      lastName: "Nowak",
      nickname: "ana",
      avatarId: "fox",
      lessonsCompleted: 2,
      lessonsInProgress: 1,
      exerciseAttempts: 4,
      correctAttempts: 3,
      points: 120,
      lastActivityAt: daysAgo(1),
    }),
  );
  readModel.seedStudent(makeRosterStudent("s-bo", { nickname: "bo" }));
  readModel.seedStudent(
    makeRosterStudent("s-cy", { firstName: "Cy", points: 999, lastActivityAt: daysAgo(0) }),
  );
  await links.link(TEACHER_A.id, "s-ana", NOW);
  await links.link(TEACHER_A.id, "s-bo", NOW);
  await links.link(TEACHER_B.id, "s-cy", NOW);
});

describe("teacher-only access (every use case checks the role itself)", () => {
  it("refuses a student viewer before reading anything", async () => {
    await expect(overview.execute({ viewer: A_STUDENT })).rejects.toBeInstanceOf(ForbiddenError);
    await expect(list.execute({ viewer: A_STUDENT, page: 1, pageSize: 20 })).rejects.toBeInstanceOf(
      ForbiddenError,
    );
    await expect(
      detail.execute({ viewer: A_STUDENT, studentId: "s-ana", locale: "en" }),
    ).rejects.toBeInstanceOf(ForbiddenError);
    expect(readModel.calls).toEqual([]);
  });
});

describe("GetTeacherOverviewUseCase", () => {
  it("summarises only the teacher's own students, with documented definitions", async () => {
    const result = await overview.execute({ viewer: TEACHER_A });

    expect(result).toEqual({
      totalStudents: 2,
      activeStudents: 1,
      inactiveStudents: 1,
      activeWindowDays: 7,
      lessonsCompleted: 2,
      exerciseAttempts: 4,
      accuracyPercent: 75,
      points: 120,
    });
    expect(readModel.calls).toEqual([{ method: "overview", teacherId: TEACHER_A.id }]);
  });

  it("is an honest empty state for a teacher with no students", async () => {
    const result = await overview.execute({ viewer: { id: "lonely", role: "TEACHER" } });

    expect(result.totalStudents).toBe(0);
    expect(result.accuracyPercent).toBeNull();
    expect(result.points).toBe(0);
  });
});

describe("ListTeacherStudentsUseCase", () => {
  it("returns only the teacher's students with server-derived fields", async () => {
    const page = await list.execute({ viewer: TEACHER_A, page: 1, pageSize: 20 });

    expect(page.total).toBe(2);
    expect(page.totalPages).toBe(1);
    expect(page.students.map((s) => s.studentId)).toEqual(["s-ana", "s-bo"]);
    expect(page.students[0]).toEqual({
      studentId: "s-ana",
      displayName: "Ana Nowak",
      nickname: "ana",
      avatarId: "fox",
      lessonsCompleted: 2,
      lessonsInProgress: 1,
      exerciseAttempts: 4,
      accuracyPercent: 75,
      points: 120,
      lastActivityAt: daysAgo(1),
      active: true,
    });
    expect(page.students[1]).toMatchObject({
      displayName: "bo",
      accuracyPercent: null,
      active: false,
    });
  });

  it("never includes another teacher's student, whatever the filters", async () => {
    const page = await list.execute({ viewer: TEACHER_A, page: 1, pageSize: 20, search: "cy" });
    expect(page.students).toEqual([]);
    expect(page.total).toBe(0);
  });

  it("translates page/pageSize into a bounded offset and passes the active window", async () => {
    const seen: unknown[] = [];
    const original = readModel.listStudents.bind(readModel);
    readModel.listStudents = (teacherId, query) => {
      seen.push(query);
      return original(teacherId, query);
    };

    const page = await list.execute({
      viewer: TEACHER_A,
      page: 2,
      pageSize: 1,
      activity: "active",
    });

    expect(seen).toEqual([
      {
        activeSince: daysAgo(7),
        activity: "active",
        sort: "name",
        direction: "asc",
        limit: 1,
        offset: 1,
      },
    ]);
    expect(page).toMatchObject({ page: 2, pageSize: 1, total: 1, totalPages: 1, students: [] });
  });

  it("defaults the direction by sort field, and honours an explicit one", async () => {
    const byPoints = await list.execute({
      viewer: TEACHER_A,
      page: 1,
      pageSize: 20,
      sort: "points",
    });
    expect(byPoints.students.map((s) => s.studentId)).toEqual(["s-ana", "s-bo"]);
    expect(byPoints.sort).toEqual({ field: "points", direction: "desc" });

    const ascending = await list.execute({
      viewer: TEACHER_A,
      page: 1,
      pageSize: 20,
      sort: "points",
      direction: "asc",
    });
    expect(ascending.students.map((s) => s.studentId)).toEqual(["s-bo", "s-ana"]);
  });

  it("refuses page sizes and pages outside the server's bounds even if a caller skips validation", async () => {
    await expect(list.execute({ viewer: TEACHER_A, page: 1, pageSize: 51 })).rejects.toThrow(
      RangeError,
    );
    await expect(list.execute({ viewer: TEACHER_A, page: 0, pageSize: 20 })).rejects.toThrow(
      RangeError,
    );
    await expect(list.execute({ viewer: TEACHER_A, page: 1001, pageSize: 20 })).rejects.toThrow(
      RangeError,
    );
  });
});

describe("GetTeacherStudentDetailUseCase", () => {
  beforeEach(async () => {
    readModel.seedStudent(readModel.records.get("s-ana")!, {
      lessons: [
        {
          lessonId: "pl-first",
          status: "completed",
          startedAt: daysAgo(3),
          completedAt: daysAgo(2),
          updatedAt: daysAgo(2),
        },
        {
          lessonId: "pl-second",
          status: "in_progress",
          startedAt: daysAgo(1),
          completedAt: null,
          updatedAt: daysAgo(1),
        },
        // A lesson that has since been removed from the catalog still counts as recorded activity.
        {
          lessonId: "pl-retired",
          status: "completed",
          startedAt: daysAgo(30),
          completedAt: daysAgo(30),
          updatedAt: daysAgo(30),
        },
      ],
      exercisesAttempted: 2,
      exercisesLatestCorrect: 1,
      recentAttempts: [
        { exerciseId: "pl-first-tf", correct: true, answeredAt: daysAgo(1) },
        { exerciseId: "pl-gone-tf", correct: false, answeredAt: daysAgo(2) },
      ],
      weekly: [
        {
          weekStart: new Date("2026-09-21T00:00:00.000Z"),
          lessonsCompleted: 1,
          exerciseAttempts: 4,
          correctAttempts: 3,
          points: 40,
        },
      ],
    });
    await gamification.recordPoints({
      userId: "s-ana",
      amount: 10,
      reason: "exercise-completed",
      sourceId: "pl-first-tf",
      createdAt: daysAgo(1),
    });
  });

  it("refuses another teacher's student with the same not-found as a missing one (IDOR)", async () => {
    await expect(
      detail.execute({ viewer: TEACHER_B, studentId: "s-ana", locale: "en" }),
    ).rejects.toBeInstanceOf(TeachingStudentNotFoundError);
    await expect(
      detail.execute({ viewer: TEACHER_A, studentId: "no-such-student", locale: "en" }),
    ).rejects.toBeInstanceOf(TeachingStudentNotFoundError);
  });

  it("reads points and achievements from the M8 ledger, not a dashboard calculation", async () => {
    const result = await detail.execute({ viewer: TEACHER_A, studentId: "s-ana", locale: "en" });

    expect(result.gamification.totalPoints).toBe(10);
    expect(result.gamification.achievements.totalCount).toBeGreaterThan(0);
    expect(result.gamification.unlocked).toEqual([]);
  });

  it("groups lesson progress by language and level against the published lessons there", async () => {
    const result = await detail.execute({ viewer: TEACHER_A, studentId: "s-ana", locale: "en" });

    expect(result.lessons.byLevel).toEqual([
      { languageId: "pl", levelId: "a1", completed: 1, inProgress: 1, publishedLessons: 2 },
    ]);
    expect(result.lessons.unmatched).toBe(1);
    expect(result.lessons.recent.map((l) => [l.lessonId, l.title, l.status])).toEqual([
      ["pl-second", "Title of pl-second", "in_progress"],
      ["pl-first", "Title of pl-first", "completed"],
      ["pl-retired", null, "completed"],
    ]);
  });

  it("reports exercise performance with attempts, accuracy and M7's latest-result counts", async () => {
    const result = await detail.execute({ viewer: TEACHER_A, studentId: "s-ana", locale: "en" });

    expect(result.exercises).toEqual({
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
          lessonTitle: "Title of pl-first",
          correct: true,
          answeredAt: daysAgo(1),
        },
        {
          exerciseId: "pl-gone-tf",
          lessonId: null,
          lessonTitle: null,
          correct: false,
          answeredAt: daysAgo(2),
        },
      ],
    });
  });

  it("returns the last eight UTC weeks, oldest first, filling weeks with no activity", async () => {
    const result = await detail.execute({ viewer: TEACHER_A, studentId: "s-ana", locale: "en" });

    expect(result.weekly).toHaveLength(8);
    expect(result.weekly[0]).toEqual({
      weekStart: new Date("2026-08-03T00:00:00.000Z"),
      lessonsCompleted: 0,
      exerciseAttempts: 0,
      correctAttempts: 0,
      accuracyPercent: null,
      points: 0,
    });
    expect(result.weekly[7]).toEqual({
      weekStart: new Date("2026-09-21T00:00:00.000Z"),
      lessonsCompleted: 1,
      exerciseAttempts: 4,
      correctAttempts: 3,
      accuracyPercent: 75,
      points: 40,
    });
  });

  it("does not fail when a level the student worked in is no longer available", async () => {
    readModel.seedStudent(makeRosterStudent("s-bo"), {
      lessons: [
        {
          lessonId: "pl-later",
          status: "in_progress",
          startedAt: daysAgo(1),
          completedAt: null,
          updatedAt: daysAgo(1),
        },
      ],
    });
    // `pl-later` is in pl/a2, which the sample catalog declares "planned".
    const result = await detail.execute({ viewer: TEACHER_A, studentId: "s-bo", locale: "en" });

    expect(result.lessons.byLevel).toEqual([
      { languageId: "pl", levelId: "a2", completed: 0, inProgress: 1, publishedLessons: null },
    ]);
  });
});
