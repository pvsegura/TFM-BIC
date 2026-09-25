import { loadEnv } from "@tfm-bic/config";
import type {
  AchievementsResponse,
  ExerciseAnswerResponse,
  GamificationSummaryResponse,
  LessonCompletionResponse,
  PointHistoryResponse,
} from "@tfm-bic/contracts";
import { makeExerciseCatalog } from "@tfm-bic/application/testing";
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
  const catalog = makeExerciseCatalog();
  testDeps.contentRepository.catalog = catalog;
  testDeps.exerciseRepository.exercises = catalog.exercises.slice();
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

const cookiesOf = (cookie: string | undefined) =>
  cookie ? { cookies: { [SESSION_COOKIE_NAME]: cookie } } : {};

function get(built: Built, cookie: string | undefined, url: string, headers = {}) {
  return built.app.inject({ method: "GET", url, headers, ...cookiesOf(cookie) });
}

function answer(built: Built, cookie: string, exerciseId: string, value: unknown) {
  return built.app.inject({
    method: "POST",
    url: `/exercises/${exerciseId}/answer`,
    payload: { answer: value },
    ...cookiesOf(cookie),
  });
}

function complete(built: Built, cookie: string, lessonId: string) {
  return built.app.inject({
    method: "POST",
    url: `/lessons/${lessonId}/complete`,
    ...cookiesOf(cookie),
  });
}

const totalOf = (built: Built, userId: string) =>
  built.gamificationRepository.transactions
    .filter((t) => t.userId === userId)
    .reduce((sum, t) => sum + t.amount, 0);

const READ_ROUTES = [
  "/gamification/summary",
  "/gamification/achievements",
  "/gamification/point-transactions",
];

describe("authentication — every gamification route is authenticated-only, server-side", () => {
  it.each(READ_ROUTES)(
    "GET %s returns 401 without a session, with a tampered cookie and after logout",
    async (url) => {
      const built = build();
      const { cookie } = await signIn(built, "ana@example.com");

      const anonymous = await get(built, undefined, url);
      const tampered = await get(built, `${cookie}tampered`, url);
      await built.app.inject({
        method: "POST",
        url: "/auth/logout",
        cookies: { [SESSION_COOKIE_NAME]: cookie },
      });
      const loggedOut = await get(built, cookie, url);

      for (const response of [anonymous, tampered, loggedOut]) {
        expect(response.statusCode).toBe(401);
        expect(response.json()).toEqual({ error: "Unauthenticated" });
      }
    },
  );
});

describe("GET /gamification/summary", () => {
  it("is honest for a student who has not done anything yet", async () => {
    const built = build();
    const { cookie } = await signIn(built, "ana@example.com");

    const response = await get(built, cookie, "/gamification/summary");

    expect(response.statusCode).toBe(200);
    expect(response.json<GamificationSummaryResponse>()).toEqual({
      totalPoints: 0,
      achievements: { unlockedCount: 0, totalCount: 4 },
      inProgressAchievements: [],
      recentTransactions: [],
    });
  });

  it("reflects what the student earned, and explains it", async () => {
    const built = build();
    const { cookie } = await signIn(built, "ana@example.com");
    await answer(built, cookie, "pl-first-mc", "opt-a");

    const summary = (
      await get(built, cookie, "/gamification/summary")
    ).json<GamificationSummaryResponse>();

    expect(summary.totalPoints).toBe(60);
    expect(summary.achievements).toEqual({ unlockedCount: 1, totalCount: 4 });
    expect(summary.recentTransactions).toMatchObject([
      {
        amount: 50,
        reason: "achievement-unlocked",
        sourceId: "first-exercise",
        title: "First exercise",
      },
      { amount: 10, reason: "exercise-completed", sourceId: "pl-first-mc", title: null },
    ]);
    expect(summary.inProgressAchievements.map((a) => a.key)).toEqual([
      "hundred-points",
      "ten-correct-exercises",
    ]);
  });

  it("is per student: one student's points never appear for another", async () => {
    const built = build();
    const ana = await signIn(built, "ana@example.com");
    const ben = await signIn(built, "ben@example.com");
    await answer(built, ana.cookie, "pl-first-mc", "opt-a");

    const benSummary = (
      await get(built, ben.cookie, "/gamification/summary")
    ).json<GamificationSummaryResponse>();

    expect(benSummary.totalPoints).toBe(0);
    expect(benSummary.recentTransactions).toEqual([]);
  });

  it("is never cached by a browser or a shared proxy", async () => {
    const built = build();
    const { cookie } = await signIn(built, "ana@example.com");

    for (const url of READ_ROUTES) {
      const response = await get(built, cookie, url);
      expect(response.headers["cache-control"]).toBe("private, no-store");
    }
  });

  it("does not write anything", async () => {
    const built = build();
    const { cookie } = await signIn(built, "ana@example.com");

    for (const url of READ_ROUTES) {
      await get(built, cookie, url);
    }

    expect(built.gamificationRepository.writeCalls).toBe(0);
  });

  it("does not leak the student's id, or any other student's", async () => {
    const built = build();
    const { user, cookie } = await signIn(built, "ana@example.com");
    await answer(built, cookie, "pl-first-mc", "opt-a");

    for (const url of READ_ROUTES) {
      const response = await get(built, cookie, url);
      expect(response.body).not.toContain(user.id);
      expect(response.body).not.toMatch(/userId|user_id/);
    }
  });
});

describe("IDOR and mass assignment — the student is always the session's", () => {
  it.each(READ_ROUTES)(
    "GET %s refuses a userId in the query instead of honouring it",
    async (url) => {
      const built = build();
      const ana = await signIn(built, "ana@example.com");
      const ben = await signIn(built, "ben@example.com");
      await answer(built, ben.cookie, "pl-first-mc", "opt-a");

      const response = await get(built, ana.cookie, `${url}?userId=${ben.user.id}`);

      expect(response.statusCode).toBe(400);
      expect(response.json()).toEqual({ error: "Invalid request." });
      expect(response.body).not.toContain(ben.user.id);
    },
  );

  it.each([
    (id: string) => `/users/${id}/gamification`,
    (id: string) => `/users/${id}/gamification/summary`,
    (id: string) => `/gamification/${id}`,
    (id: string) => `/gamification/${id}/summary`,
    (id: string) => `/gamification/users/${id}/points`,
    () => `/gamification/summary/other-user`,
  ])("has no route that addresses another student's data (%#)", async (path) => {
    const built = build();
    const ana = await signIn(built, "ana@example.com");
    const ben = await signIn(built, "ben@example.com");
    await answer(built, ben.cookie, "pl-first-mc", "opt-a");

    const response = await get(built, ana.cookie, path(ben.user.id));

    expect(response.statusCode).toBe(404);
    // Nothing of anyone's gamification data — not a total, not a transaction — is in the answer.
    expect(response.body).not.toMatch(/totalPoints|unlockedCount|recentTransactions|sourceId/);
  });

  it.each(["POST", "PUT", "PATCH", "DELETE"] as const)(
    "%s to any gamification path is not a route: there is no way to ask for points",
    async (method) => {
      const built = build();
      const { cookie } = await signIn(built, "ana@example.com");
      const paths = [
        "/gamification/summary",
        "/gamification/achievements",
        "/gamification/point-transactions",
        "/gamification/points",
        "/gamification/award",
        "/gamification/give-me-points",
        "/gamification/achievements/first-exercise/unlock",
      ];

      for (const url of paths) {
        const response = await built.app.inject({
          method,
          url,
          payload: { userId: "x", amount: 1000 },
          headers: { origin: APP_BASE_URL },
          ...cookiesOf(cookie),
        });
        expect(response.statusCode).toBe(404);
      }

      expect(built.gamificationRepository.writeCalls).toBe(0);
    },
  );

  it("cannot be paid by naming points in an answer or a completion", async () => {
    const built = build();
    const { user, cookie } = await signIn(built, "ana@example.com");

    const wrongAnswer = await built.app.inject({
      method: "POST",
      url: "/exercises/pl-first-mc/answer",
      payload: { answer: "opt-b", points: 1000, correct: true, pointsAwarded: 1000 },
      ...cookiesOf(cookie),
    });
    const lesson = await built.app.inject({
      method: "POST",
      url: "/lessons/pl-first/complete",
      payload: { points: 1000, userId: user.id },
      ...cookiesOf(cookie),
    });

    expect(wrongAnswer.statusCode).toBe(400);
    expect(lesson.statusCode).toBe(400);
    expect(totalOf(built, user.id)).toBe(0);
  });
});

describe("GET /gamification/achievements", () => {
  it("lists every achievement, locked and unlocked, with progress and the unlock date", async () => {
    const built = build();
    const { cookie } = await signIn(built, "ana@example.com");
    await answer(built, cookie, "pl-first-mc", "opt-a");

    const body = (
      await get(built, cookie, "/gamification/achievements")
    ).json<AchievementsResponse>();

    expect(body.totalCount).toBe(4);
    expect(body.unlockedCount).toBe(1);
    expect(body.achievements.map((a) => [a.key, a.unlocked])).toEqual([
      ["first-exercise", true],
      ["first-lesson", false],
      ["ten-correct-exercises", false],
      ["hundred-points", false],
    ]);
    expect(body.achievements[0]).toEqual({
      key: "first-exercise",
      title: "First exercise",
      description: "Answer an exercise correctly for the first time.",
      iconId: "spark",
      rewardPoints: 50,
      unlocked: true,
      unlockedAt: NOW.toISOString(),
      progress: { current: 1, target: 1 },
    });
    expect(body.achievements[2]?.progress).toEqual({ current: 1, target: 10 });
    expect(body.achievements[1]?.unlockedAt).toBeNull();
  });

  it("uses the language the client asks for when texts exist, and the default otherwise", async () => {
    const built = build();
    const { cookie } = await signIn(built, "ana@example.com");

    const asked = await get(built, cookie, "/gamification/achievements", {
      "accept-language": "fr-FR,fr;q=0.9,en;q=0.5",
    });
    const junk = await get(built, cookie, "/gamification/achievements", {
      "accept-language": "<script>,;;;q=,,,",
    });

    expect(asked.statusCode).toBe(200);
    expect(asked.json<AchievementsResponse>().achievements[0]?.title).toBe("First exercise");
    expect(junk.statusCode).toBe(200);
  });
});

describe("GET /gamification/point-transactions", () => {
  async function seedLedger(built: Built, userId: string, count: number) {
    for (let n = 0; n < count; n += 1) {
      await built.gamificationRepository.recordPoints({
        userId,
        amount: 10,
        reason: "exercise-completed",
        sourceId: `pl-seed-${String(n)}`,
        createdAt: NOW,
      });
    }
  }

  it("pages the history newest first, with a cursor, until it runs out", async () => {
    const built = build();
    const { user, cookie } = await signIn(built, "ana@example.com");
    await seedLedger(built, user.id, 25);

    const first = (
      await get(built, cookie, "/gamification/point-transactions?limit=10")
    ).json<PointHistoryResponse>();
    const second = (
      await get(
        built,
        cookie,
        `/gamification/point-transactions?limit=10&before=${String(first.nextBefore)}`,
      )
    ).json<PointHistoryResponse>();
    const third = (
      await get(
        built,
        cookie,
        `/gamification/point-transactions?limit=10&before=${String(second.nextBefore)}`,
      )
    ).json<PointHistoryResponse>();

    expect(first.transactions).toHaveLength(10);
    expect(second.transactions).toHaveLength(10);
    expect(third.transactions).toHaveLength(5);
    expect(third.nextBefore).toBeNull();
    const ids = [...first.transactions, ...second.transactions, ...third.transactions].map(
      (t) => t.id,
    );
    expect(new Set(ids).size).toBe(25);
    expect([...ids].sort((a, b) => b - a)).toEqual(ids);
  });

  it("defaults to a page of 20", async () => {
    const built = build();
    const { user, cookie } = await signIn(built, "ana@example.com");
    await seedLedger(built, user.id, 30);

    const body = (
      await get(built, cookie, "/gamification/point-transactions")
    ).json<PointHistoryResponse>();

    expect(body.transactions).toHaveLength(20);
    expect(body.nextBefore).not.toBeNull();
  });

  it("only ever returns the caller's transactions, even with another student's cursor", async () => {
    const built = build();
    const ana = await signIn(built, "ana@example.com");
    const ben = await signIn(built, "ben@example.com");
    await seedLedger(built, ana.user.id, 3);
    await seedLedger(built, ben.user.id, 3);

    const body = (
      await get(built, ana.cookie, "/gamification/point-transactions?before=999")
    ).json<PointHistoryResponse>();

    expect(body.transactions).toHaveLength(3);
    expect(body.transactions.every((t) => t.sourceId.startsWith("pl-seed-"))).toBe(true);
    expect(totalOf(built, ben.user.id)).toBe(30);
  });

  it.each([
    "limit=0",
    "limit=51",
    "limit=-1",
    "limit=abc",
    "limit=1e2",
    "limit=1&limit=2",
    "before=0",
    "before=abc",
    "before=1;DROP",
    "sort=asc",
  ])("rejects ?%s with a fixed message", async (query) => {
    const built = build();
    const { cookie } = await signIn(built, "ana@example.com");

    const response = await get(built, cookie, `/gamification/point-transactions?${query}`);

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({ error: "Invalid request." });
  });
});

describe("rewards from answering an exercise", () => {
  it("reports what the first correct answer earned, and nothing for a repeat or a wrong answer", async () => {
    const built = build();
    const { user, cookie } = await signIn(built, "ana@example.com");

    const wrong = (
      await answer(built, cookie, "pl-first-mc", "opt-b")
    ).json<ExerciseAnswerResponse>();
    const first = (
      await answer(built, cookie, "pl-first-mc", "opt-a")
    ).json<ExerciseAnswerResponse>();
    const repeat = (
      await answer(built, cookie, "pl-first-mc", "opt-a")
    ).json<ExerciseAnswerResponse>();

    expect(wrong.rewards).toEqual({ pointsAwarded: 0, achievementsUnlocked: [] });
    expect(first.rewards.pointsAwarded).toBe(60);
    expect(first.rewards.achievementsUnlocked).toEqual([
      {
        key: "first-exercise",
        title: "First exercise",
        description: "Answer an exercise correctly for the first time.",
        iconId: "spark",
        rewardPoints: 50,
      },
    ]);
    expect(repeat.rewards).toEqual({ pointsAwarded: 0, achievementsUnlocked: [] });
    expect(repeat.correct).toBe(true);
    expect(totalOf(built, user.id)).toBe(60);
    expect(built.exerciseAttemptRepository.attempts).toHaveLength(3);
  });

  it("pays once when the same correct answer arrives concurrently (double submit, retry)", async () => {
    const built = build();
    const { user, cookie } = await signIn(built, "ana@example.com");

    const responses = await Promise.all(
      Array.from({ length: 6 }, () => answer(built, cookie, "pl-first-mc", "opt-a")),
    );

    expect(responses.every((r) => r.statusCode === 200)).toBe(true);
    expect(
      responses.filter((r) => r.json<ExerciseAnswerResponse>().rewards.pointsAwarded > 0),
    ).toHaveLength(1);
    expect(totalOf(built, user.id)).toBe(60);
  });

  it("does not reward an exercise that is not available, or an answer that is malformed", async () => {
    const built = build();
    const { user, cookie } = await signIn(built, "ana@example.com");

    const draft = await answer(built, cookie, "pl-first-draft", true);
    const malformed = await answer(built, cookie, "pl-first-mc", 42);

    expect(draft.statusCode).toBe(404);
    expect(malformed.statusCode).toBe(400);
    expect(totalOf(built, user.id)).toBe(0);
  });

  it("fails with a generic error, and says nothing of the reward, when the reward cannot be stored", async () => {
    const built = build();
    const { user, cookie } = await signIn(built, "ana@example.com");
    built.gamificationRepository.failWhen = () => true;

    const response = await answer(built, cookie, "pl-first-mc", "opt-a");

    expect(response.statusCode).toBe(500);
    expect(response.json()).toEqual({ error: "Internal Server Error" });
    expect(response.body).not.toMatch(/reward|ledger|point|Injected|first-exercise/i);
    expect(built.exerciseAttemptRepository.attempts).toHaveLength(1);
    expect(totalOf(built, user.id)).toBe(0);

    built.gamificationRepository.failWhen = undefined;
    const retry = await answer(built, cookie, "pl-first-mc", "opt-a");
    expect(retry.json<ExerciseAnswerResponse>().rewards.pointsAwarded).toBe(60);
  });
});

describe("rewards from completing a lesson", () => {
  it("reports what the first completion earned, and nothing for a repeat", async () => {
    const built = build();
    const { user, cookie } = await signIn(built, "ana@example.com");

    const first = (await complete(built, cookie, "pl-first")).json<LessonCompletionResponse>();
    const repeat = (await complete(built, cookie, "pl-first")).json<LessonCompletionResponse>();

    expect(first.status).toBe("completed");
    expect(first.rewards.pointsAwarded).toBe(75);
    expect(first.rewards.achievementsUnlocked.map((a) => a.key)).toEqual(["first-lesson"]);
    expect(repeat.rewards).toEqual({ pointsAwarded: 0, achievementsUnlocked: [] });
    expect(repeat.completedAt).toBe(first.completedAt);
    expect(totalOf(built, user.id)).toBe(75);
  });

  it("pays once when completion is sent many times at once", async () => {
    const built = build();
    const { user, cookie } = await signIn(built, "ana@example.com");

    await Promise.all(Array.from({ length: 6 }, () => complete(built, cookie, "pl-first")));

    expect(totalOf(built, user.id)).toBe(75);
  });

  it("does not reward starting or opening a lesson, or a lesson that is not available", async () => {
    const built = build();
    const { user, cookie } = await signIn(built, "ana@example.com");

    const start = await built.app.inject({
      method: "POST",
      url: "/lessons/pl-first/start",
      ...cookiesOf(cookie),
    });
    const open = await get(built, cookie, "/lessons/pl-first");
    const hidden = await complete(built, cookie, "pl-draft");

    expect(Object.keys(start.json<object>()).sort()).toEqual([
      "completedAt",
      "startedAt",
      "status",
    ]);
    expect(open.statusCode).toBe(200);
    expect(hidden.statusCode).toBe(404);
    expect(totalOf(built, user.id)).toBe(0);
  });

  it("gives each student their own reward for the same lesson", async () => {
    const built = build();
    const ana = await signIn(built, "ana@example.com");
    const ben = await signIn(built, "ben@example.com");

    await complete(built, ana.cookie, "pl-first");
    const benResult = (
      await complete(built, ben.cookie, "pl-first")
    ).json<LessonCompletionResponse>();

    expect(benResult.rewards.pointsAwarded).toBe(75);
  });
});

describe("rate limiting", () => {
  it("limits reads per client, like the other student routes", async () => {
    const built = build();
    const { cookie } = await signIn(built, "ana@example.com");

    let last = 200;
    for (let n = 0; n < 130 && last === 200; n += 1) {
      last = (await get(built, cookie, "/gamification/summary")).statusCode;
    }

    expect(last).toBe(429);
  });
});

describe("failures", () => {
  it("answers a read that fails with a generic 500 that names nothing internal", async () => {
    const built = build();
    const { cookie } = await signIn(built, "ana@example.com");
    built.gamificationRepository.loadFacts = () =>
      Promise.reject(new Error("db exploded: secret-host"));

    const response = await get(built, cookie, "/gamification/summary");

    expect(response.statusCode).toBe(500);
    expect(response.json()).toEqual({ error: "Internal Server Error" });
    expect(response.body).not.toContain("secret-host");
  });
});
