import { loadEnv } from "@tfm-bic/config";
import type {
  LessonListResponse,
  LessonCompletionResponse,
  LessonProgressResponse,
  LessonResponse,
} from "@tfm-bic/contracts";
import { makeContentItem, makeLessonCatalog } from "@tfm-bic/application/testing";
import type { FastifyInstance } from "fastify";
import { afterEach, describe, expect, it } from "vitest";

import { SESSION_COOKIE_NAME } from "../constants/session-cookie.js";
import { buildServer } from "../server.js";
import { buildTestDeps } from "../test-support/build-test-deps.js";

const APP_BASE_URL = "https://app.example.com";
const PASSWORD = "correct-password";
const NOW = new Date("2026-01-01T00:00:00.000Z");

let app: FastifyInstance | undefined;

afterEach(async () => {
  await app?.close();
  app = undefined;
});

function build(overrides: Partial<Parameters<typeof loadEnv>[0]> = {}) {
  const testDeps = buildTestDeps(NOW);
  // The lesson catalog adds the cases only lessons care about: an explanation
  // (published, but not a lesson) and a published lesson in a planned level.
  testDeps.contentRepository.catalog = makeLessonCatalog();
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
  );
  return { app, ...testDeps };
}

type Built = ReturnType<typeof build>;

async function signIn(built: Built, email: string) {
  const user = built.userRepository.seed("STUDENT", {
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

function cookiesOf(cookie: string | undefined) {
  return cookie ? { cookies: { [SESSION_COOKIE_NAME]: cookie } } : {};
}

function listLessons(built: Built, cookie: string | undefined, query = "language=pl&level=a1") {
  return built.app.inject({ method: "GET", url: `/lessons?${query}`, ...cookiesOf(cookie) });
}

function getLesson(built: Built, cookie: string | undefined, lessonId: string) {
  return built.app.inject({ method: "GET", url: `/lessons/${lessonId}`, ...cookiesOf(cookie) });
}

function act(
  built: Built,
  action: "start" | "complete",
  cookie: string | undefined,
  lessonId: string,
  options: { payload?: unknown; headers?: Record<string, string> } = {},
) {
  return built.app.inject({
    method: "POST",
    url: `/lessons/${lessonId}/${action}`,
    ...(options.payload === undefined ? {} : { payload: options.payload as object }),
    ...(options.headers ? { headers: options.headers } : {}),
    ...cookiesOf(cookie),
  });
}

describe("authentication — every lesson route is authenticated-only, server-side", () => {
  it.each([
    ["GET /lessons", (b: Built, c?: string) => listLessons(b, c)],
    ["GET /lessons/:lessonId", (b: Built, c?: string) => getLesson(b, c, "pl-first")],
    ["POST /lessons/:lessonId/start", (b: Built, c?: string) => act(b, "start", c, "pl-first")],
    [
      "POST /lessons/:lessonId/complete",
      (b: Built, c?: string) => act(b, "complete", c, "pl-first"),
    ],
  ])(
    "%s returns 401 without a session, with a tampered cookie and after logout",
    async (_n, call) => {
      const built = build();
      const { cookie } = await signIn(built, "ana@example.com");

      const anonymous = await call(built);
      const tampered = await call(built, `${cookie}tampered`);
      await built.app.inject({
        method: "POST",
        url: "/auth/logout",
        cookies: { [SESSION_COOKIE_NAME]: cookie },
      });
      const loggedOut = await call(built, cookie);

      for (const response of [anonymous, tampered, loggedOut]) {
        expect(response.statusCode).toBe(401);
        expect(response.json()).toEqual({ error: "Unauthenticated" });
      }
      expect(built.lessonProgressRepository.writeCalls).toBe(0);
    },
  );
});

describe("GET /lessons", () => {
  it("lists the published lessons of the language and level in order, with not_started progress", async () => {
    const built = build();
    const { cookie } = await signIn(built, "ana@example.com");

    const response = await listLessons(built, cookie);

    expect(response.statusCode).toBe(200);
    const body: LessonListResponse = response.json();
    expect(body.lessons.map((lesson) => lesson.id)).toEqual(["pl-first", "pl-second"]);
    expect(body.lessons[0]).toEqual({
      id: "pl-first",
      languageId: "pl",
      levelId: "a1",
      title: "Title of pl-first",
      description: "Description of pl-first",
      order: 10,
      instructionLanguage: "en",
      progress: { status: "not_started", startedAt: null, completedAt: null },
    });
  });

  it("returns list metadata only: no blocks, no status, no type", async () => {
    const built = build();
    const { cookie } = await signIn(built, "ana@example.com");

    const [lesson] = (await listLessons(built, cookie)).json<LessonListResponse>().lessons;

    expect(Object.keys(lesson ?? {}).sort()).toEqual([
      "description",
      "id",
      "instructionLanguage",
      "languageId",
      "levelId",
      "order",
      "progress",
      "title",
    ]);
  });

  it("leaves out drafts, archived items and published content that is not a lesson", async () => {
    const built = build();
    const { cookie } = await signIn(built, "ana@example.com");

    const ids = (await listLessons(built, cookie))
      .json<LessonListResponse>()
      .lessons.map((lesson) => lesson.id);

    expect(ids).not.toContain("pl-draft");
    expect(ids).not.toContain("pl-archived");
    expect(ids).not.toContain("pl-note");
  });

  it("filters by language: the same route serves another language unchanged", async () => {
    const built = build();
    const { cookie } = await signIn(built, "ana@example.com");

    const response = await listLessons(built, cookie, "language=xx&level=a1");

    expect(response.json<LessonListResponse>().lessons.map((l) => l.id)).toEqual(["xx-only"]);
  });

  it("shows only the caller's own progress, never another student's", async () => {
    const built = build();
    const ana = await signIn(built, "ana@example.com");
    const ben = await signIn(built, "ben@example.com");
    await act(built, "complete", ana.cookie, "pl-first");

    const anaList = (await listLessons(built, ana.cookie)).json<LessonListResponse>();
    const benList = (await listLessons(built, ben.cookie)).json<LessonListResponse>();

    expect(anaList.lessons.map((l) => l.progress.status)).toEqual(["completed", "not_started"]);
    expect(benList.lessons.map((l) => l.progress.status)).toEqual(["not_started", "not_started"]);
  });

  it("is never cached as shared state: progress is per student", async () => {
    const built = build();
    const { cookie } = await signIn(built, "ana@example.com");

    const response = await listLessons(built, cookie);

    expect(response.headers["cache-control"]).toBe("private, no-store");
  });

  it("does not write anything", async () => {
    const built = build();
    const { cookie } = await signIn(built, "ana@example.com");

    await listLessons(built, cookie);

    expect(built.lessonProgressRepository.writeCalls).toBe(0);
  });

  it.each([
    ["no parameters", ""],
    ["only a language", "language=pl"],
    ["only a level", "level=a1"],
    ["an uppercase language", "language=PL&level=a1"],
    ["a level that is not CEFR", "language=pl&level=z9"],
    ["a repeated parameter", "language=pl&language=en&level=a1"],
    ["a path traversal in the language", "language=..%2F..%2Fetc&level=a1"],
    ["an injection-like language", "language=pl%27%20OR%20%271%27%3D%271&level=a1"],
    ["an injection-like level", "language=pl&level=a1%3B%20DROP%20TABLE%20lesson_progress"],
    ["a script in the language", "language=%3Cscript%3Ealert(1)%3C%2Fscript%3E&level=a1"],
  ])("returns 400 for %s, without echoing the input", async (_name, query) => {
    const built = build();
    const { cookie } = await signIn(built, "ana@example.com");

    const response = await listLessons(built, cookie, query);

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({ error: "Invalid request." });
  });

  it("returns 404 for a well-formed language that does not exist", async () => {
    const built = build();
    const { cookie } = await signIn(built, "ana@example.com");

    const response = await listLessons(built, cookie, "language=zz&level=a1");

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({ error: "Language not found." });
  });

  it("returns 404 for a planned level, even though it holds a published lesson", async () => {
    const built = build();
    const { cookie } = await signIn(built, "ana@example.com");

    const response = await listLessons(built, cookie, "language=pl&level=a2");

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({ error: "Level not available." });
  });
});

describe("GET /lessons/:lessonId", () => {
  it("returns the lesson with its blocks and the caller's progress", async () => {
    const built = build();
    const { cookie } = await signIn(built, "ana@example.com");

    const response = await getLesson(built, cookie, "pl-first");

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      id: "pl-first",
      languageId: "pl",
      levelId: "a1",
      title: "Title of pl-first",
      description: "Description of pl-first",
      order: 10,
      instructionLanguage: "en",
      blocks: [{ type: "explanation", text: "Body of pl-first" }],
      progress: { status: "not_started", startedAt: null, completedAt: null },
    });
  });

  it("does not expose internal metadata such as the publication status", async () => {
    const built = build();
    const { cookie } = await signIn(built, "ana@example.com");

    const body = (await getLesson(built, cookie, "pl-first")).json<Record<string, unknown>>();

    expect(body).not.toHaveProperty("status");
    expect(body).not.toHaveProperty("type");
  });

  it("is never cached as shared state", async () => {
    const built = build();
    const { cookie } = await signIn(built, "ana@example.com");

    expect((await getLesson(built, cookie, "pl-first")).headers["cache-control"]).toBe(
      "private, no-store",
    );
  });

  it("does not record progress: opening through GET is a read", async () => {
    const built = build();
    const { cookie } = await signIn(built, "ana@example.com");

    await getLesson(built, cookie, "pl-first");

    expect(built.lessonProgressRepository.writeCalls).toBe(0);
    expect(built.lessonProgressRepository.records).toEqual([]);
  });

  it("reflects the caller's progress after start and complete", async () => {
    const built = build();
    const { cookie } = await signIn(built, "ana@example.com");

    await act(built, "start", cookie, "pl-first");
    const started = (await getLesson(built, cookie, "pl-first")).json<LessonResponse>();
    await act(built, "complete", cookie, "pl-first");
    const done = (await getLesson(built, cookie, "pl-first")).json<LessonResponse>();

    expect(started.progress.status).toBe("in_progress");
    expect(done.progress).toEqual({
      status: "completed",
      startedAt: NOW.toISOString(),
      completedAt: NOW.toISOString(),
    });
  });

  it.each([
    ["does not exist", "pl-nonexistent"],
    ["is a draft", "pl-draft"],
    ["is archived", "pl-archived"],
    ["is published content but not a lesson", "pl-note"],
    ["is published but in a level that is not available", "pl-planned"],
  ])("returns the same 404 for a lesson that %s", async (_reason, lessonId) => {
    const built = build();
    const { cookie } = await signIn(built, "ana@example.com");

    const response = await getLesson(built, cookie, lessonId);

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({ error: "Lesson not found." });
  });

  it.each([
    ["uppercase", "PL-Greetings"],
    ["a path traversal", "..%2F..%2Fetc%2Fpasswd"],
    ["an injection-like id", "pl-first%27%3B%20DROP%20TABLE%20lesson_progress%3B--"],
    ["a script", "%3Cscript%3Ealert(1)%3C%2Fscript%3E"],
    ["too long", "a".repeat(65)],
    ["a leading hyphen", "-pl-first"],
  ])("returns 400 for a malformed id (%s), without echoing it", async (_name, lessonId) => {
    const built = build();
    const { cookie } = await signIn(built, "ana@example.com");

    const response = await getLesson(built, cookie, lessonId);

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({ error: "Invalid request." });
  });

  it("never serves a lesson whose text looks like markup (XSS defense in depth)", async () => {
    const built = build();
    const { cookie } = await signIn(built, "ana@example.com");
    built.contentRepository.catalog = {
      ...makeLessonCatalog(),
      content: [
        makeContentItem("pl-evil", "pl", "a1", {
          blocks: [{ type: "explanation", text: "<script>alert(1)</script>" }],
        }),
      ],
    };

    const response = await getLesson(built, cookie, "pl-evil");

    expect(response.statusCode).toBe(500);
    expect(response.body).not.toContain("script");
  });

  it("never serves a block type it does not know", async () => {
    const built = build();
    const { cookie } = await signIn(built, "ana@example.com");
    built.contentRepository.catalog = {
      ...makeLessonCatalog(),
      content: [
        makeContentItem("pl-unknown", "pl", "a1", {
          // A future block type this API version has no schema for.
          blocks: [{ type: "exercise", prompt: "x" } as never],
        }),
      ],
    };

    const response = await getLesson(built, cookie, "pl-unknown");

    expect(response.statusCode).toBe(500);
    expect(response.json()).toEqual({ error: "Internal Server Error" });
  });
});

describe("POST /lessons/:lessonId/start", () => {
  it("marks the lesson in progress, with the server's time", async () => {
    const built = build();
    const { cookie } = await signIn(built, "ana@example.com");

    const response = await act(built, "start", cookie, "pl-first");

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      status: "in_progress",
      startedAt: NOW.toISOString(),
      completedAt: null,
    });
  });

  it("is repeatable: it keeps one record and the original start time", async () => {
    const built = build();
    const { cookie } = await signIn(built, "ana@example.com");
    await act(built, "start", cookie, "pl-first");
    built.clock.advance(60_000);

    const again = (await act(built, "start", cookie, "pl-first")).json<LessonProgressResponse>();

    expect(again.startedAt).toBe(NOW.toISOString());
    expect(built.lessonProgressRepository.records).toHaveLength(1);
  });

  it("never takes a completed lesson back to in progress", async () => {
    const built = build();
    const { cookie } = await signIn(built, "ana@example.com");
    await act(built, "complete", cookie, "pl-first");

    const response = await act(built, "start", cookie, "pl-first");

    expect(response.json<LessonProgressResponse>().status).toBe("completed");
  });

  it("is never cached as shared state", async () => {
    const built = build();
    const { cookie } = await signIn(built, "ana@example.com");

    expect((await act(built, "start", cookie, "pl-first")).headers["cache-control"]).toBe(
      "private, no-store",
    );
  });

  it.each([
    ["does not exist", "pl-nonexistent"],
    ["is a draft", "pl-draft"],
    ["is not a lesson", "pl-note"],
    ["is in a level that is not available", "pl-planned"],
  ])("returns 404 for a lesson that %s, and writes nothing", async (_reason, lessonId) => {
    const built = build();
    const { cookie } = await signIn(built, "ana@example.com");

    const response = await act(built, "start", cookie, lessonId);

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({ error: "Lesson not found." });
    expect(built.lessonProgressRepository.writeCalls).toBe(0);
  });

  it("returns 400 for a malformed id, and writes nothing", async () => {
    const built = build();
    const { cookie } = await signIn(built, "ana@example.com");

    const response = await act(built, "start", cookie, "PL_First");

    expect(response.statusCode).toBe(400);
    expect(built.lessonProgressRepository.writeCalls).toBe(0);
  });

  it("returns 403 for a cross-origin request (CSRF defense in depth), and writes nothing", async () => {
    const built = build();
    const { cookie } = await signIn(built, "ana@example.com");

    const response = await act(built, "start", cookie, "pl-first", {
      headers: { origin: "https://evil.example.com" },
    });

    expect(response.statusCode).toBe(403);
    expect(built.lessonProgressRepository.writeCalls).toBe(0);
  });
});

describe("POST /lessons/:lessonId/complete", () => {
  it("completes the lesson, stamped with the server's time", async () => {
    const built = build();
    const { cookie } = await signIn(built, "ana@example.com");

    const response = await act(built, "complete", cookie, "pl-first");

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      status: "completed",
      startedAt: NOW.toISOString(),
      completedAt: NOW.toISOString(),
      // M8: the first completion is rewarded (25 + the first-lesson achievement's 50).
      rewards: {
        pointsAwarded: 75,
        achievementsUnlocked: [
          {
            key: "first-lesson",
            title: "First lesson",
            description: "Complete your first lesson.",
            iconId: "book",
            rewardPoints: 50,
          },
        ],
      },
    });
  });

  it("stores the caller as the owner of the record — the user comes from the session", async () => {
    const built = build();
    const { user, cookie } = await signIn(built, "ana@example.com");

    await act(built, "complete", cookie, "pl-first");

    expect(built.lessonProgressRepository.records.map((r) => r.userId)).toEqual([user.id]);
  });

  it("is idempotent: complete, complete, complete is one completed record with the first time", async () => {
    const built = build();
    const { cookie } = await signIn(built, "ana@example.com");

    const progressOf = async (response: ReturnType<typeof act>) => {
      const { rewards: _rewards, ...progress } = (await response).json<LessonCompletionResponse>();
      return progress;
    };
    const first = await progressOf(act(built, "complete", cookie, "pl-first"));
    built.clock.advance(60_000);
    await act(built, "complete", cookie, "pl-first");
    built.clock.advance(60_000);
    const third = await progressOf(act(built, "complete", cookie, "pl-first"));

    expect(third).toEqual(first);
    expect(built.lessonProgressRepository.records).toHaveLength(1);
  });

  it("completes only the requested lesson", async () => {
    const built = build();
    const { cookie } = await signIn(built, "ana@example.com");

    await act(built, "complete", cookie, "pl-first");

    const list = (await listLessons(built, cookie)).json<LessonListResponse>();
    expect(list.lessons.map((l) => [l.id, l.progress.status])).toEqual([
      ["pl-first", "completed"],
      ["pl-second", "not_started"],
    ]);
  });

  it("cannot be used to complete a lesson for another student", async () => {
    const built = build();
    const ana = await signIn(built, "ana@example.com");
    const ben = await signIn(built, "ben@example.com");

    // Ben tries to name Ana in the body: the body is refused outright…
    const attempt = await act(built, "complete", ben.cookie, "pl-first", {
      payload: { userId: ana.user.id },
    });
    // …and Ben's own completion never touches Ana's progress.
    await act(built, "complete", ben.cookie, "pl-first");

    expect(attempt.statusCode).toBe(400);
    const anaList = (await listLessons(built, ana.cookie)).json<LessonListResponse>();
    expect(anaList.lessons.every((l) => l.progress.status === "not_started")).toBe(true);
    expect(built.lessonProgressRepository.records.map((r) => r.userId)).toEqual([ben.user.id]);
  });

  it.each([
    ["userId", { userId: "someone-else" }],
    ["completedAt", { completedAt: "1999-01-01T00:00:00.000Z" }],
    ["startedAt", { startedAt: "1999-01-01T00:00:00.000Z" }],
    ["status", { status: "in_progress" }],
    ["lessonId", { lessonId: "pl-second" }],
    ["role", { role: "TEACHER" }],
    ["points", { points: 1000 }],
  ])(
    "rejects a body that tries to set %s (mass assignment), and writes nothing",
    async (_f, payload) => {
      const built = build();
      const { cookie } = await signIn(built, "ana@example.com");

      const response = await act(built, "complete", cookie, "pl-first", { payload });

      expect(response.statusCode).toBe(400);
      expect(response.json()).toEqual({ error: "Invalid request." });
      expect(built.lessonProgressRepository.writeCalls).toBe(0);
    },
  );

  it("accepts an empty JSON object as its body", async () => {
    const built = build();
    const { cookie } = await signIn(built, "ana@example.com");

    const response = await act(built, "complete", cookie, "pl-first", { payload: {} });

    expect(response.statusCode).toBe(200);
  });

  it.each([
    ["does not exist", "pl-nonexistent"],
    ["is a draft", "pl-draft"],
    ["is archived", "pl-archived"],
    ["is not a lesson", "pl-note"],
    ["is in a level that is not available", "pl-planned"],
  ])("returns 404 for a lesson that %s, and records nothing", async (_reason, lessonId) => {
    const built = build();
    const { cookie } = await signIn(built, "ana@example.com");

    const response = await act(built, "complete", cookie, lessonId);

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({ error: "Lesson not found." });
    expect(built.lessonProgressRepository.records).toEqual([]);
  });

  it.each([
    ["an injection-like id", "pl-first%27%3B%20DROP%20TABLE%20lesson_progress%3B--"],
    ["a path traversal", "..%2F..%2Fetc%2Fpasswd"],
    ["a malformed id", "NOT_A_LESSON"],
  ])("returns 400 for %s, and records nothing", async (_name, lessonId) => {
    const built = build();
    const { cookie } = await signIn(built, "ana@example.com");

    const response = await act(built, "complete", cookie, lessonId);

    expect(response.statusCode).toBe(400);
    expect(built.lessonProgressRepository.writeCalls).toBe(0);
  });

  it("returns 403 for a cross-origin request (CSRF defense in depth), and records nothing", async () => {
    const built = build();
    const { cookie } = await signIn(built, "ana@example.com");

    const response = await act(built, "complete", cookie, "pl-first", {
      headers: { origin: "https://evil.example.com" },
    });

    expect(response.statusCode).toBe(403);
    expect(built.lessonProgressRepository.writeCalls).toBe(0);
  });

  it("accepts a same-origin request", async () => {
    const built = build();
    const { cookie } = await signIn(built, "ana@example.com");

    const response = await act(built, "complete", cookie, "pl-first", {
      headers: { origin: APP_BASE_URL },
    });

    expect(response.statusCode).toBe(200);
  });
});

describe("routing", () => {
  it("answers other methods on the lesson paths with 404, so nothing can edit a lesson", async () => {
    const built = build();
    const { cookie } = await signIn(built, "ana@example.com");

    for (const method of ["PUT", "PATCH", "DELETE"] as const) {
      const response = await built.app.inject({
        method,
        url: "/lessons/pl-first",
        payload: { title: "Hacked" },
        cookies: { [SESSION_COOKIE_NAME]: cookie },
      });
      expect(response.statusCode).toBe(404);
    }
    const created = await built.app.inject({
      method: "POST",
      url: "/lessons",
      payload: { id: "pl-new" },
      cookies: { [SESSION_COOKIE_NAME]: cookie },
    });
    expect(created.statusCode).toBe(404);
  });
});

describe("rate limiting", () => {
  it("bounds a client, so one session cannot hammer the lesson routes", async () => {
    const built = build();
    const { cookie } = await signIn(built, "ana@example.com");

    let last = 0;
    for (let request = 0; request < 121; request += 1) {
      last = (await getLesson(built, cookie, "pl-first")).statusCode;
    }

    expect(last).toBe(429);
  });
});
