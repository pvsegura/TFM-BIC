import { loadEnv } from "@tfm-bic/config";
import type {
  ExerciseAnswerResponse,
  ExerciseListResponse,
  ExerciseResponse,
} from "@tfm-bic/contracts";
import { makeExerciseCatalog } from "@tfm-bic/application/testing";
import { createExerciseId, ExerciseTypeRegistry, type Exercise } from "@tfm-bic/domain";
import { makeMultipleChoiceExercise } from "@tfm-bic/domain/testing";
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

function cookiesOf(cookie: string | undefined) {
  return cookie ? { cookies: { [SESSION_COOKIE_NAME]: cookie } } : {};
}

function listExercises(built: Built, cookie: string | undefined, lessonId = "pl-first") {
  return built.app.inject({
    method: "GET",
    url: `/lessons/${lessonId}/exercises`,
    ...cookiesOf(cookie),
  });
}

function getExercise(built: Built, cookie: string | undefined, exerciseId: string) {
  return built.app.inject({ method: "GET", url: `/exercises/${exerciseId}`, ...cookiesOf(cookie) });
}

function answer(
  built: Built,
  cookie: string | undefined,
  exerciseId: string,
  payload: unknown,
  headers: Record<string, string> = {},
) {
  return built.app.inject({
    method: "POST",
    url: `/exercises/${exerciseId}/answer`,
    ...(payload === undefined ? {} : { payload: payload as object }),
    headers,
    ...cookiesOf(cookie),
  });
}

/** Every string anywhere in a response body, so a secret cannot hide in a nested value. */
const ANSWER_KEY_FIELDS =
  /correctOptionId|acceptedAnswers|correctAnswer|caseSensitive|configuration|explanation|isCorrect/;

describe("authentication — every exercise route is authenticated-only, server-side", () => {
  it.each([
    ["GET /lessons/:lessonId/exercises", (b: Built, c?: string) => listExercises(b, c)],
    ["GET /exercises/:exerciseId", (b: Built, c?: string) => getExercise(b, c, "pl-first-mc")],
    [
      "POST /exercises/:exerciseId/answer",
      (b: Built, c?: string) => answer(b, c, "pl-first-mc", { answer: "opt-a" }),
    ],
  ])(
    "%s returns 401 without a session, with a tampered cookie and after logout",
    async (_name, call) => {
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
        expect(response.body).not.toMatch(ANSWER_KEY_FIELDS);
      }
      expect(built.exerciseAttemptRepository.writeCalls).toBe(0);
    },
  );
});

describe("GET /lessons/:lessonId/exercises", () => {
  it("lists the published exercises of the lesson in explicit order with the caller's results", async () => {
    const built = build();
    const { cookie } = await signIn(built, "ana@example.com");

    const response = await listExercises(built, cookie);

    expect(response.statusCode).toBe(200);
    const body: ExerciseListResponse = response.json();
    expect(body.exercises.map((e) => [e.id, e.type, e.order])).toEqual([
      ["pl-first-mc", "multiple-choice", 10],
      ["pl-first-text", "text-answer", 20],
      ["pl-first-tf", "true-false", 30],
    ]);
    expect(body.exercises[0]).toEqual({
      id: "pl-first-mc",
      lessonId: "pl-first",
      languageId: "pl",
      levelId: "a1",
      type: "multiple-choice",
      order: 10,
      prompt: expect.any(String) as string,
      instructionLanguage: "en",
      result: { status: "unanswered", attemptCount: 0, lastAnsweredAt: null },
    });
    expect(body.progress).toEqual({ total: 3, answered: 0 });
  });

  it("never lists a draft or archived exercise", async () => {
    const built = build();
    const { cookie } = await signIn(built, "ana@example.com");

    const ids = (await listExercises(built, cookie))
      .json<ExerciseListResponse>()
      .exercises.map((e) => e.id);

    expect(ids).not.toContain("pl-first-draft");
    expect(ids).not.toContain("pl-first-archived");
  });

  it("carries no answer key, option or explanation", async () => {
    const built = build();
    const { cookie } = await signIn(built, "ana@example.com");

    const response = await listExercises(built, cookie);

    expect(response.body).not.toMatch(ANSWER_KEY_FIELDS);
    expect(response.body).not.toContain("options");
  });

  it("is private and never cached, because results are per student", async () => {
    const built = build();
    const { cookie } = await signIn(built, "ana@example.com");

    const response = await listExercises(built, cookie);

    expect(response.headers["cache-control"]).toBe("private, no-store");
  });

  it("shows only the session user's own results", async () => {
    const built = build();
    const ana = await signIn(built, "ana@example.com");
    const ben = await signIn(built, "ben@example.com");
    await answer(built, ben.cookie, "pl-first-mc", { answer: "opt-a" });
    await answer(built, ben.cookie, "pl-first-tf", { answer: false });

    const forAna = (await listExercises(built, ana.cookie)).json<ExerciseListResponse>();
    const forBen = (await listExercises(built, ben.cookie)).json<ExerciseListResponse>();

    expect(forAna.progress).toEqual({ total: 3, answered: 0 });
    expect(forBen.progress).toEqual({ total: 3, answered: 2 });
    expect(forBen.exercises.map((e) => e.result.status)).toEqual([
      "correct",
      "unanswered",
      "incorrect",
    ]);
  });

  it("returns an empty list for a visible lesson with no exercises", async () => {
    const built = build();
    const { cookie } = await signIn(built, "ana@example.com");

    const response = await listExercises(built, cookie, "pl-empty");

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ exercises: [], progress: { total: 0, answered: 0 } });
  });

  it.each([
    ["an unknown lesson", "pl-nope"],
    ["a draft lesson", "pl-draft"],
    ["an archived lesson", "pl-archived"],
    ["an explanation, not a lesson", "pl-note"],
    ["a lesson in a level that is not available", "pl-planned"],
  ])("returns the same 404 for %s", async (_name, lessonId) => {
    const built = build();
    const { cookie } = await signIn(built, "ana@example.com");

    const response = await listExercises(built, cookie, lessonId);

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({ error: "Lesson not found." });
  });

  it.each([
    ["uppercase", "PL_First"],
    ["too long", "a".repeat(65)],
    ["a SQL fragment", encodeURIComponent("pl-x'; DROP TABLE exercise_attempts;--")],
    ["a path traversal", encodeURIComponent("../../etc/passwd")],
    ["a markup fragment", encodeURIComponent("<script>alert(1)</script>")],
  ])("returns 400 for a malformed lesson id (%s) without echoing it", async (_name, lessonId) => {
    const built = build();
    const { cookie } = await signIn(built, "ana@example.com");

    const response = await listExercises(built, cookie, lessonId);

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({ error: "Invalid request." });
  });
});

describe("GET /exercises/:exerciseId — presentation, never the answer key", () => {
  it("presents a multiple-choice exercise: prompt and options only", async () => {
    const built = build();
    const { cookie } = await signIn(built, "ana@example.com");

    const response = await getExercise(built, cookie, "pl-first-mc");

    expect(response.statusCode).toBe(200);
    const body: ExerciseResponse = response.json();
    expect(Object.keys(body).sort()).toEqual(
      [
        "id",
        "instructionLanguage",
        "languageId",
        "lessonId",
        "levelId",
        "options",
        "order",
        "prompt",
        "result",
        "type",
      ].sort(),
    );
    expect(body.type === "multiple-choice" && body.options).toEqual([
      { id: "opt-a", text: "Dzień dobry" },
      { id: "opt-b", text: "Cześć" },
      { id: "opt-c", text: "Dobranoc" },
    ]);
    expect(body.result).toEqual({ status: "unanswered", attemptCount: 0, lastAnsweredAt: null });
  });

  it.each([
    ["pl-first-mc", "multiple-choice"],
    ["pl-first-text", "text-answer"],
    ["pl-first-tf", "true-false"],
  ])("does not expose the answer key of %s anywhere in the response", async (id, type) => {
    const built = build();
    const { cookie } = await signIn(built, "ana@example.com");

    const response = await getExercise(built, cookie, id);

    expect(response.json()).toMatchObject({ type });
    expect(response.body).not.toMatch(ANSWER_KEY_FIELDS);
    // Not the explanation, and not the accepted answers or the correct option's text as an answer.
    expect(response.body).not.toContain("Dobranoc is said when saying goodnight");
    expect(response.body).not.toContain("Dzień dobry is polite.");
    expect(response.body).not.toContain('"correct"');
  });

  it("does not expose the answer key even when the stored exercise carries extra fields", async () => {
    const built = build();
    const { cookie } = await signIn(built, "ana@example.com");
    const leaky = {
      ...makeMultipleChoiceExercise({ id: createExerciseId("pl-first-leaky") }),
      lessonId: makeExerciseCatalog().exercises[0]?.lessonId,
      secret: "correct is opt-a",
    } as Exercise;
    built.exerciseRepository.exercises.push(leaky);

    const response = await getExercise(built, cookie, "pl-first-leaky");

    expect(response.statusCode).toBe(200);
    expect(response.body).not.toContain("secret");
    expect(response.body).not.toMatch(ANSWER_KEY_FIELDS);
  });

  it("is private and never cached", async () => {
    const built = build();
    const { cookie } = await signIn(built, "ana@example.com");

    expect((await getExercise(built, cookie, "pl-first-mc")).headers["cache-control"]).toBe(
      "private, no-store",
    );
  });

  it("is a read: opening an exercise never records an attempt", async () => {
    const built = build();
    const { cookie } = await signIn(built, "ana@example.com");

    await getExercise(built, cookie, "pl-first-mc");

    expect(built.exerciseAttemptRepository.writeCalls).toBe(0);
  });

  it("shows the session user's own result and never another student's (IDOR)", async () => {
    const built = build();
    const ana = await signIn(built, "ana@example.com");
    const ben = await signIn(built, "ben@example.com");
    await answer(built, ben.cookie, "pl-first-mc", { answer: "opt-a" });
    await answer(built, ben.cookie, "pl-first-mc", { answer: "opt-b" });

    const forAna = (await getExercise(built, ana.cookie, "pl-first-mc")).json<ExerciseResponse>();
    const forBen = (await getExercise(built, ben.cookie, "pl-first-mc")).json<ExerciseResponse>();

    expect(forAna.result.status).toBe("unanswered");
    expect(forBen.result).toMatchObject({ status: "incorrect", attemptCount: 2 });
  });

  it("ignores a user id or exercise result supplied in the query string", async () => {
    const built = build();
    const ana = await signIn(built, "ana@example.com");
    const ben = await signIn(built, "ben@example.com");
    await answer(built, ben.cookie, "pl-first-mc", { answer: "opt-a" });

    const response = await built.app.inject({
      method: "GET",
      url: `/exercises/pl-first-mc?userId=${ben.user.id}&result=correct`,
      ...cookiesOf(ana.cookie),
    });

    expect(response.json<ExerciseResponse>().result.status).toBe("unanswered");
  });

  it.each([
    ["an exercise that does not exist", "pl-first-nope"],
    ["a draft exercise", "pl-first-draft"],
    ["an archived exercise", "pl-first-archived"],
    ["an exercise of a draft lesson", "pl-draft-tf"],
    ["an exercise of a lesson in a level that is not available", "pl-planned-tf"],
    ["an exercise attached to content that is not a lesson", "pl-note-tf"],
  ])("returns the same 404 for %s, so nothing can be probed", async (_name, exerciseId) => {
    const built = build();
    const { cookie } = await signIn(built, "ana@example.com");

    const response = await getExercise(built, cookie, exerciseId);

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({ error: "Exercise not found." });
  });

  it.each([
    ["uppercase", "PL-First-MC"],
    ["underscores", "pl_first_mc"],
    ["too long", `pl-${"a".repeat(80)}`],
    ["a SQL fragment", encodeURIComponent("pl-x' OR '1'='1")],
    ["a path traversal", encodeURIComponent("../../etc/passwd")],
    ["an encoded null byte", "pl-first%00"],
    ["a markup fragment", encodeURIComponent("<img src=x onerror=alert(1)>")],
  ])("returns 400 for a malformed id (%s) without echoing it", async (_name, exerciseId) => {
    const built = build();
    const { cookie } = await signIn(built, "ana@example.com");

    const response = await getExercise(built, cookie, exerciseId);

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({ error: "Invalid request." });
  });
});

describe("POST /exercises/:exerciseId/answer", () => {
  it("evaluates a correct answer on the server and records the attempt for the session user", async () => {
    const built = build();
    const { cookie, user } = await signIn(built, "ana@example.com");

    const response = await answer(built, cookie, "pl-first-mc", { answer: "opt-a" });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      correct: true,
      feedback: "Dzień dobry is polite.",
      correctAnswer: "opt-a",
      result: { status: "correct", attemptCount: 1, lastAnsweredAt: NOW.toISOString() },
      // M8: the first correct answer is rewarded (10 + the first-exercise achievement's 50).
      rewards: {
        pointsAwarded: 60,
        achievementsUnlocked: [
          {
            key: "first-exercise",
            title: "First exercise",
            description: "Answer an exercise correctly for the first time.",
            iconId: "spark",
            rewardPoints: 50,
          },
        ],
      },
    });
    expect(built.exerciseAttemptRepository.attempts).toEqual([
      {
        id: 1,
        userId: user.id,
        exerciseId: "pl-first-mc",
        submittedAnswer: "opt-a",
        correct: true,
        answeredAt: NOW,
      },
    ]);
  });

  it("evaluates an incorrect answer and says which answer was correct", async () => {
    const built = build();
    const { cookie } = await signIn(built, "ana@example.com");

    const response = await answer(built, cookie, "pl-first-mc", { answer: "opt-c" });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      correct: false,
      correctAnswer: "opt-a",
      result: { status: "incorrect", attemptCount: 1 },
    });
    expect(built.exerciseAttemptRepository.attempts[0]?.correct).toBe(false);
  });

  it("evaluates a text answer with the documented normalisation", async () => {
    const built = build();
    const { cookie } = await signIn(built, "ana@example.com");

    const trimmedAndCased = await answer(built, cookie, "pl-first-text", { answer: "  dobranoc " });
    const punctuationNotListed = await answer(built, cookie, "pl-first-text", {
      answer: "Dobranoc!",
    });

    expect(trimmedAndCased.json<ExerciseAnswerResponse>().correct).toBe(true);
    expect(punctuationNotListed.json<ExerciseAnswerResponse>().correct).toBe(false);
  });

  it("evaluates a true/false answer", async () => {
    const built = build();
    const { cookie } = await signIn(built, "ana@example.com");

    const right = await answer(built, cookie, "pl-first-tf", { answer: true });
    const wrong = await answer(built, cookie, "pl-first-tf", { answer: false });

    expect(right.json<ExerciseAnswerResponse>().correct).toBe(true);
    expect(wrong.json<ExerciseAnswerResponse>().correct).toBe(false);
  });

  it("makes a retry a new attempt and keeps the earlier one", async () => {
    const built = build();
    const { cookie } = await signIn(built, "ana@example.com");

    await answer(built, cookie, "pl-first-mc", { answer: "opt-b" });
    const retry = await answer(built, cookie, "pl-first-mc", { answer: "opt-a" });

    expect(
      built.exerciseAttemptRepository.attempts.map((a) => [a.submittedAnswer, a.correct]),
    ).toEqual([
      ["opt-b", false],
      ["opt-a", true],
    ]);
    expect(retry.json<ExerciseAnswerResponse>().result).toMatchObject({
      status: "correct",
      attemptCount: 2,
    });
  });

  it("is private and never cached", async () => {
    const built = build();
    const { cookie } = await signIn(built, "ana@example.com");

    expect(
      (await answer(built, cookie, "pl-first-mc", { answer: "opt-a" })).headers["cache-control"],
    ).toBe("private, no-store");
  });

  it("returns only the verdict, the feedback, the correct answer, the result and the rewards", async () => {
    const built = build();
    const { cookie } = await signIn(built, "ana@example.com");

    const response = await answer(built, cookie, "pl-first-text", { answer: "nope" });

    expect(Object.keys(response.json()).sort()).toEqual([
      "correct",
      "correctAnswer",
      "feedback",
      "result",
      "rewards",
    ]);
    // The other accepted answer is not revealed.
    expect(response.body).not.toContain("Dobranoc.");
  });

  describe("the client supplies an answer and nothing else (mass assignment)", () => {
    it.each([
      ["a client-supplied verdict", { answer: "opt-c", correct: true }],
      ["a user id", { answer: "opt-a", userId: "someone-else" }],
      ["a score", { answer: "opt-a", score: 999_999 }],
      ["a timestamp", { answer: "opt-a", answeredAt: "2000-01-01T00:00:00.000Z" }],
      ["an exercise id", { answer: "opt-a", exerciseId: "pl-first-tf" }],
      ["an exercise type", { answer: "opt-a", type: "true-false" }],
      ["the whole forged bundle", { answer: "opt-c", correct: true, userId: "x", score: 999999 }],
    ])("rejects %s with 400 and records nothing", async (_name, payload) => {
      const built = build();
      const { cookie } = await signIn(built, "ana@example.com");

      const response = await answer(built, cookie, "pl-first-mc", payload);

      expect(response.statusCode).toBe(400);
      expect(response.json()).toEqual({ error: "Invalid request." });
      expect(built.exerciseAttemptRepository.writeCalls).toBe(0);
    });

    it("judges a wrong answer wrong however the request is dressed up", async () => {
      const built = build();
      const { cookie } = await signIn(built, "ana@example.com");

      const response = await answer(built, cookie, "pl-first-mc", { answer: "opt-c" });

      expect(response.json<ExerciseAnswerResponse>().correct).toBe(false);
    });

    it("records the attempt for the session user, whatever the request says", async () => {
      const built = build();
      const ana = await signIn(built, "ana@example.com");
      const ben = await signIn(built, "ben@example.com");

      await answer(built, ana.cookie, "pl-first-mc", { answer: "opt-a" });

      expect(built.exerciseAttemptRepository.attempts.map((a) => a.userId)).toEqual([ana.user.id]);
      expect(built.exerciseAttemptRepository.attempts.map((a) => a.userId)).not.toContain(
        ben.user.id,
      );
    });
  });

  describe("an answer that is not a well-formed answer to this exercise", () => {
    it.each([
      ["an option the exercise does not have", "pl-first-mc", "opt-z"],
      ["a boolean for a multiple-choice exercise", "pl-first-mc", true],
      ["an empty text answer", "pl-first-text", ""],
      ["a whitespace-only text answer", "pl-first-text", "    "],
      ["a text answer with a line break", "pl-first-text", "Dobra\nnoc"],
      ["a string for a true/false exercise", "pl-first-tf", "true"],
    ])("rejects %s with 400 'Invalid answer.' and records nothing", async (_n, id, value) => {
      const built = build();
      const { cookie } = await signIn(built, "ana@example.com");

      const response = await answer(built, cookie, id, { answer: value });

      expect(response.statusCode).toBe(400);
      expect(response.json()).toEqual({ error: "Invalid answer." });
      expect(built.exerciseAttemptRepository.writeCalls).toBe(0);
    });

    it.each([
      ["no body", undefined],
      ["an empty object", {}],
      ["null", null],
      ["a null answer", { answer: null }],
      ["a numeric answer", { answer: 1 }],
      ["an object answer", { answer: { optionId: "opt-a" } }],
      ["an array answer", { answer: ["opt-a"] }],
      ["an over-long answer", { answer: "a".repeat(501) }],
    ])("rejects %s with 400 'Invalid request.' and records nothing", async (_name, payload) => {
      const built = build();
      const { cookie } = await signIn(built, "ana@example.com");

      const response = await answer(built, cookie, "pl-first-mc", payload);

      expect(response.statusCode).toBe(400);
      expect(response.json()).toEqual({ error: "Invalid request." });
      expect(built.exerciseAttemptRepository.writeCalls).toBe(0);
    });

    it("rejects a bare JSON string instead of an object with 400 and records nothing", async () => {
      const built = build();
      const { cookie } = await signIn(built, "ana@example.com");

      const response = await answer(built, cookie, "pl-first-mc", '"opt-a"', {
        "content-type": "application/json",
      });

      expect(response.statusCode).toBe(400);
      expect(built.exerciseAttemptRepository.writeCalls).toBe(0);
    });

    it("refuses a body that is not JSON (415) and records nothing", async () => {
      const built = build();
      const { cookie } = await signIn(built, "ana@example.com");

      const response = await answer(built, cookie, "pl-first-mc", "opt-a", {
        "content-type": "application/x-www-form-urlencoded",
      });

      expect(response.statusCode).toBe(415);
      expect(built.exerciseAttemptRepository.writeCalls).toBe(0);
    });

    it("rejects a body that is too large before parsing it (413)", async () => {
      const built = build();
      const { cookie } = await signIn(built, "ana@example.com");

      const response = await answer(built, cookie, "pl-first-text", { answer: "a".repeat(5000) });

      expect(response.statusCode).toBe(413);
      expect(built.exerciseAttemptRepository.writeCalls).toBe(0);
    });
  });

  it.each([
    ["an exercise that does not exist", "pl-first-nope"],
    ["a draft exercise", "pl-first-draft"],
    ["an archived exercise", "pl-first-archived"],
    ["an exercise of a draft lesson", "pl-draft-tf"],
    ["an exercise of a lesson in a level that is not available", "pl-planned-tf"],
    ["an exercise attached to content that is not a lesson", "pl-note-tf"],
  ])("returns the same 404 for %s and records nothing", async (_name, exerciseId) => {
    const built = build();
    const { cookie } = await signIn(built, "ana@example.com");

    const response = await answer(built, cookie, exerciseId, { answer: true });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({ error: "Exercise not found." });
    expect(built.exerciseAttemptRepository.writeCalls).toBe(0);
  });

  it.each([
    ["uppercase", "PL-First-TF"],
    ["a SQL fragment", encodeURIComponent("pl-x'; DROP TABLE exercise_attempts;--")],
    ["a path traversal", encodeURIComponent("../../etc/passwd")],
  ])("returns 400 for a malformed id (%s) and records nothing", async (_name, exerciseId) => {
    const built = build();
    const { cookie } = await signIn(built, "ana@example.com");

    const response = await answer(built, cookie, exerciseId, { answer: true });

    expect(response.statusCode).toBe(400);
    expect(built.exerciseAttemptRepository.writeCalls).toBe(0);
  });

  it("returns 403 for a cross-origin request (CSRF defense in depth) and records nothing", async () => {
    const built = build();
    const { cookie } = await signIn(built, "ana@example.com");

    const response = await answer(
      built,
      cookie,
      "pl-first-mc",
      { answer: "opt-a" },
      { origin: "https://evil.example.com" },
    );

    expect(response.statusCode).toBe(403);
    expect(built.exerciseAttemptRepository.writeCalls).toBe(0);
  });

  it("accepts a request from the application's own origin", async () => {
    const built = build();
    const { cookie } = await signIn(built, "ana@example.com");

    const response = await answer(
      built,
      cookie,
      "pl-first-mc",
      { answer: "opt-a" },
      { origin: APP_BASE_URL },
    );

    expect(response.statusCode).toBe(200);
  });

  it("answers 501 for an exercise type the application has no evaluator for, and records nothing", async () => {
    const built = build();
    built.exerciseDeps.typeRegistry = new ExerciseTypeRegistry([]);
    const { cookie } = await signIn(built, "ana@example.com");

    const response = await answer(built, cookie, "pl-first-tf", { answer: true });

    expect(response.statusCode).toBe(501);
    expect(response.json()).toEqual({ error: "This kind of exercise is not supported." });
    expect(built.exerciseAttemptRepository.writeCalls).toBe(0);
  });

  it("answers a generic 500 — no internals, no answer key — for an exercise with a broken configuration, and records nothing", async () => {
    const built = build();
    const broken = makeMultipleChoiceExercise({
      id: createExerciseId("pl-first-broken"),
      lessonId: makeExerciseCatalog().exercises[0]?.lessonId as never,
      configuration: { options: [{ id: "opt-a", text: "One" }], correctOptionId: "opt-secret" },
    });
    built.exerciseRepository.exercises.push(broken);
    const { cookie } = await signIn(built, "ana@example.com");

    const response = await answer(built, cookie, "pl-first-broken", { answer: "opt-a" });

    expect(response.statusCode).toBe(500);
    expect(response.json()).toEqual({ error: "Internal Server Error" });
    expect(response.body).not.toContain("opt-secret");
    expect(response.body).not.toContain("configuration");
    expect(built.exerciseAttemptRepository.writeCalls).toBe(0);
  });
});

describe("rate limiting", () => {
  it("bounds how many answers one client can submit, so attempts cannot be inserted without limit", async () => {
    const built = build();
    const { cookie } = await signIn(built, "ana@example.com");

    let last = 0;
    for (let request = 0; request < 61; request += 1) {
      last = (await answer(built, cookie, "pl-first-tf", { answer: true })).statusCode;
    }

    expect(last).toBe(429);
    expect(built.exerciseAttemptRepository.attempts).toHaveLength(60);
  });

  it("bounds reads as well", async () => {
    const built = build();
    const { cookie } = await signIn(built, "ana@example.com");

    let last = 0;
    for (let request = 0; request < 121; request += 1) {
      last = (await getExercise(built, cookie, "pl-first-mc")).statusCode;
    }

    expect(last).toBe(429);
  });

  it("relaxes the limits only when the E2E-only flag is set", async () => {
    const built = build({ E2E_RELAXED_RATE_LIMITS: "true" });
    const { cookie } = await signIn(built, "ana@example.com");

    let last = 0;
    for (let request = 0; request < 70; request += 1) {
      last = (await answer(built, cookie, "pl-first-tf", { answer: true })).statusCode;
    }

    expect(last).toBe(200);
  });
});
