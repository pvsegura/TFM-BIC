import { loadEnv } from "@tfm-bic/config";
import type {
  TeacherOverviewResponse,
  TeacherStudentDetailResponse,
  TeacherStudentsResponse,
} from "@tfm-bic/contracts";
import { makeRosterStudent } from "@tfm-bic/application/testing";
import type { Role } from "@tfm-bic/domain";
import type { FastifyInstance } from "fastify";
import { afterEach, describe, expect, it } from "vitest";

import { SESSION_COOKIE_NAME } from "../constants/session-cookie.js";
import { buildServer } from "../server.js";
import { buildTestDeps } from "../test-support/build-test-deps.js";

const APP_BASE_URL = "https://app.example.com";
const PASSWORD = "correct-password";
const NOW = new Date("2026-09-25T10:00:00.000Z");
const UNKNOWN_ID = "00000000-0000-4000-8000-000000000000";

let app: FastifyInstance | undefined;

afterEach(async () => {
  await app?.close();
  app = undefined;
});

function build(
  overrides: Partial<Parameters<typeof loadEnv>[0]> = {},
  options: { testSupport?: boolean } = {},
) {
  const testDeps = buildTestDeps(NOW);
  if (options.testSupport) {
    testDeps.teachingDeps.enableTestSupportRoutes = true;
  }
  app = buildServer(
    loadEnv({
      NODE_ENV: "test",
      APP_BASE_URL,
      AUTH_SESSION_SECRET: "test-secret-value",
      ...overrides,
    }),
    testDeps.deps,
    testDeps.profileDeps,
    testDeps.contentDeps,
    testDeps.lessonDeps,
    testDeps.exerciseDeps,
    testDeps.gamificationDeps,
    testDeps.vocabularyDeps,
    testDeps.phoneticsDeps,
    testDeps.videoDeps,
    testDeps.audioDeps,
    testDeps.teachingDeps,
    testDeps.emailDeps,
    testDeps.privacyDeps,
  );
  return { app, ...testDeps };
}

type Built = ReturnType<typeof build>;

/** User ids from the fake repository are not UUIDs; the API only accepts UUID student ids. */
let uuidCounter = 0;
const nextUuid = () => {
  uuidCounter += 1;
  return `00000000-0000-4000-8000-${String(uuidCounter).padStart(12, "0")}`;
};

async function signIn(built: Built, email: string, role: Role) {
  const user = built.userRepository.seed(role, {
    id: nextUuid(),
    email,
    normalizedEmail: email,
    passwordHash: await built.passwordHasher.hash(PASSWORD),
    emailVerified: true,
  });
  const response = await built.app.inject({
    method: "POST",
    url: "/auth/login",
    payload: { email, password: PASSWORD },
  });
  const cookie = response.cookies.find((c) => c.name === SESSION_COOKIE_NAME)?.value;
  if (!cookie) {
    throw new Error("test setup failed: no session cookie");
  }
  return { user, cookie };
}

function get(built: Built, cookie: string | undefined, url: string) {
  return built.app.inject({
    method: "GET",
    url,
    ...(cookie ? { cookies: { [SESSION_COOKIE_NAME]: cookie } } : {}),
  });
}

/** Teacher A with two students (Ana active, Bo not), teacher B with Cy; a student session too. */
async function classroom(built: Built) {
  const teacherA = await signIn(built, "a@example.com", "TEACHER");
  const teacherB = await signIn(built, "b@example.com", "TEACHER");
  const student = await signIn(built, "ana@example.com", "STUDENT");
  const bo = nextUuid();
  const cy = nextUuid();
  built.teacherReadModel.seedStudent(
    makeRosterStudent(student.user.id, {
      firstName: "Ana",
      lastName: "Nowak",
      avatarId: "avatar-01",
      lessonsCompleted: 2,
      exerciseAttempts: 4,
      correctAttempts: 3,
      points: 40,
      lastActivityAt: new Date("2026-09-24T10:00:00.000Z"),
    }),
  );
  built.teacherReadModel.seedStudent(makeRosterStudent(bo, { nickname: "bo" }));
  built.teacherReadModel.seedStudent(makeRosterStudent(cy, { firstName: "Cy" }));
  await built.teacherLinks.link(teacherA.user.id, student.user.id, NOW);
  await built.teacherLinks.link(teacherA.user.id, bo, NOW);
  await built.teacherLinks.link(teacherB.user.id, cy, NOW);
  return { teacherA, teacherB, student, ana: student.user.id, bo, cy };
}

const ROUTES = (studentId: string) => [
  "/teacher-dashboard/overview",
  "/teacher-dashboard/students",
  `/teacher-dashboard/students/${studentId}`,
];

describe("authentication and role — enforced server-side on every route", () => {
  it("refuses an anonymous request with 401", async () => {
    const built = build();
    for (const url of ROUTES(UNKNOWN_ID)) {
      const response = await get(built, undefined, url);
      expect(response.statusCode, url).toBe(401);
    }
  });

  it("refuses a student with 403, even for their own id, and reads nothing", async () => {
    const built = build();
    const { student, ana } = await classroom(built);
    built.teacherReadModel.calls.length = 0;

    for (const url of ROUTES(ana)) {
      const response = await get(built, student.cookie, url);
      expect(response.statusCode, url).toBe(403);
      expect(response.json()).toEqual({ error: "Forbidden" });
    }
    expect(built.teacherReadModel.calls).toEqual([]);
  });
});

describe("GET /teacher-dashboard/overview", () => {
  it("summarises only the signed-in teacher's students, uncached", async () => {
    const built = build();
    const { teacherA } = await classroom(built);

    const response = await get(built, teacherA.cookie, "/teacher-dashboard/overview");

    expect(response.statusCode).toBe(200);
    expect(response.headers["cache-control"]).toBe("private, no-store");
    expect(response.json<TeacherOverviewResponse>()).toEqual({
      totalStudents: 2,
      activeStudents: 1,
      inactiveStudents: 1,
      activeWindowDays: 7,
      lessonsCompleted: 2,
      exerciseAttempts: 4,
      accuracyPercent: 75,
      points: 40,
    });
  });

  it("rejects any query parameter — a teacherId cannot select someone else's data", async () => {
    const built = build();
    const { teacherA, teacherB } = await classroom(built);

    const response = await get(
      built,
      teacherA.cookie,
      `/teacher-dashboard/overview?teacherId=${teacherB.user.id}`,
    );

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({ error: "Invalid request." });
  });
});

describe("GET /teacher-dashboard/students", () => {
  it("lists the teacher's students with the documented fields and no private data", async () => {
    const built = build();
    const { teacherA, ana, bo } = await classroom(built);

    const response = await get(built, teacherA.cookie, "/teacher-dashboard/students");

    expect(response.statusCode).toBe(200);
    expect(response.headers["cache-control"]).toBe("private, no-store");
    const body = response.json<TeacherStudentsResponse>();
    expect(body.students.map((s) => s.studentId)).toEqual([ana, bo]);
    expect(body.students[0]).toEqual({
      studentId: ana,
      displayName: "Ana Nowak",
      nickname: null,
      avatarId: "avatar-01",
      lessonsCompleted: 2,
      lessonsInProgress: 0,
      exerciseAttempts: 4,
      accuracyPercent: 75,
      points: 40,
      lastActivityAt: "2026-09-24T10:00:00.000Z",
      active: true,
    });
    expect({ page: body.page, pageSize: body.pageSize, total: body.total }).toEqual({
      page: 1,
      pageSize: 20,
      total: 2,
    });
    expect(response.body).not.toMatch(/@example\.com|passwordHash|"role"/);
  });

  it("passes validated paging, filters and sorting to the read model", async () => {
    const built = build();
    const { teacherA, bo } = await classroom(built);

    const response = await get(
      built,
      teacherA.cookie,
      "/teacher-dashboard/students?q=bo&activity=inactive&sort=points&direction=asc&page=1&pageSize=1",
    );

    expect(response.statusCode).toBe(200);
    const body = response.json<TeacherStudentsResponse>();
    expect(body.students.map((s) => s.studentId)).toEqual([bo]);
    expect(body.sort).toEqual({ field: "points", direction: "asc" });
    expect(body.pageSize).toBe(1);
  });

  it.each([
    "pageSize=1000",
    "page=0",
    "sort=password_hash",
    "sort=points%3B%20DROP%20TABLE%20users",
    "direction=up",
    "activity=all",
    `q=${"x".repeat(51)}`,
    "q=%00",
    "teacherId=someone",
    "limit=5",
  ])("rejects ?%s with 400 before reading anything", async (query) => {
    const built = build();
    const { teacherA } = await classroom(built);
    built.teacherReadModel.calls.length = 0;

    const response = await get(built, teacherA.cookie, `/teacher-dashboard/students?${query}`);

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({ error: "Invalid request." });
    expect(built.teacherReadModel.calls).toEqual([]);
  });
});

describe("GET /teacher-dashboard/students/:studentId — IDOR protection", () => {
  it("returns the detail of the teacher's own student", async () => {
    const built = build();
    const { teacherA, ana } = await classroom(built);

    const response = await get(built, teacherA.cookie, `/teacher-dashboard/students/${ana}`);

    expect(response.statusCode).toBe(200);
    expect(response.headers["cache-control"]).toBe("private, no-store");
    const body = response.json<TeacherStudentDetailResponse>();
    expect(body.student.studentId).toBe(ana);
    expect(body.weekly).toHaveLength(8);
    expect(body.exercises.accuracyPercent).toBe(75);
    expect(response.body).not.toMatch(/@example\.com|passwordHash|submittedAnswer/);
  });

  it("answers another teacher's student exactly like a student that does not exist", async () => {
    const built = build();
    const { teacherA, cy } = await classroom(built);

    const foreign = await get(built, teacherA.cookie, `/teacher-dashboard/students/${cy}`);
    const missing = await get(built, teacherA.cookie, `/teacher-dashboard/students/${UNKNOWN_ID}`);

    expect(foreign.statusCode).toBe(404);
    expect(missing.statusCode).toBe(404);
    expect(foreign.body).toBe(missing.body);
    expect(foreign.json()).toEqual({ error: "Student not found." });
  });

  it("answers a teacher's own id and another teacher's id with the same 404", async () => {
    const built = build();
    const { teacherA, teacherB } = await classroom(built);

    for (const id of [teacherA.user.id, teacherB.user.id]) {
      const response = await get(built, teacherA.cookie, `/teacher-dashboard/students/${id}`);
      expect(response.statusCode).toBe(404);
    }
  });

  it("refuses a malformed id with the same 404, and an unexpected query with 400", async () => {
    const built = build();
    const { teacherA, ana } = await classroom(built);

    for (const id of ["not-a-uuid", "..%2F..%2Fadmin", "1%20OR%201%3D1"]) {
      const response = await get(built, teacherA.cookie, `/teacher-dashboard/students/${id}`);
      expect(response.statusCode, id).toBe(404);
      expect(response.json()).toEqual({ error: "Student not found." });
    }
    const withQuery = await get(
      built,
      teacherA.cookie,
      `/teacher-dashboard/students/${ana}?teacherId=x`,
    );
    expect(withQuery.statusCode).toBe(400);
  });

  it("returns a generic 500 without internals when the read model fails", async () => {
    const built = build();
    const { teacherA, ana } = await classroom(built);
    built.teacherReadModel.studentActivity = () =>
      Promise.reject(new Error("connection to 10.0.0.5 refused: secret-dsn"));

    const response = await get(built, teacherA.cookie, `/teacher-dashboard/students/${ana}`);

    expect(response.statusCode).toBe(500);
    expect(response.body).not.toMatch(/10\.0\.0\.5|secret-dsn/);
  });
});

describe("rate limiting", () => {
  it("limits reads per client", async () => {
    const built = build();
    const { teacherA } = await classroom(built);

    let last = 0;
    for (let i = 0; i < 121; i += 1) {
      last = (await get(built, teacherA.cookie, "/teacher-dashboard/overview")).statusCode;
    }
    expect(last).toBe(429);
  });
});

describe("test-support route (E2E setup only)", () => {
  const post = (built: Built, payload: Record<string, string>) =>
    built.app.inject({ method: "POST", url: "/teacher-dashboard/_test/links", payload });

  it("does not exist unless the E2E composition enables it", async () => {
    const built = build();
    const response = await post(built, { teacherEmail: "a@x.com", studentEmail: "b@x.com" });
    expect(response.statusCode).toBe(404);
  });

  it("does not exist outside NODE_ENV=test even when enabled", async () => {
    const built = build(
      { NODE_ENV: "development", DATABASE_URL: "postgres://unused" },
      { testSupport: true },
    );
    const response = await post(built, { teacherEmail: "a@x.com", studentEmail: "b@x.com" });
    expect(response.statusCode).toBe(404);
  });

  it("promotes the teacher and links the student under NODE_ENV=test", async () => {
    const built = build({}, { testSupport: true });
    const teacher = built.userRepository.seed("STUDENT", {
      email: "t@x.com",
      normalizedEmail: "t@x.com",
    });
    const student = built.userRepository.seed("STUDENT", {
      email: "s@x.com",
      normalizedEmail: "s@x.com",
    });

    const response = await post(built, { teacherEmail: "t@x.com", studentEmail: "s@x.com" });

    expect(response.statusCode).toBe(204);
    expect((await built.userRepository.findById(teacher.id))?.role).toBe("TEACHER");
    expect(built.teacherLinks.has(teacher.id, student.id)).toBe(true);
  });

  it("validates its body strictly and reports rule violations as 400", async () => {
    const built = build({}, { testSupport: true });
    built.userRepository.seed("TEACHER", { email: "t@x.com", normalizedEmail: "t@x.com" });
    built.userRepository.seed("TEACHER", { email: "t2@x.com", normalizedEmail: "t2@x.com" });

    expect((await post(built, { teacherEmail: "t@x.com" })).statusCode).toBe(400);
    expect(
      (await post(built, { teacherEmail: "t@x.com", studentEmail: "t2@x.com" })).statusCode,
    ).toBe(400);
    expect(
      (await post(built, { teacherEmail: "t@x.com", studentEmail: "nobody@x.com" })).statusCode,
    ).toBe(400);
  });
});
