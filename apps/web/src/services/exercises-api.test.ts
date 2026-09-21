import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "./api-error.js";
import { fetchExercise, fetchLessonExercises, submitAnswer } from "./exercises-api.js";

const RESULT = { status: "unanswered", attemptCount: 0, lastAnsweredAt: null };

const SUMMARY = {
  id: "pl-greetings-polite-hello",
  lessonId: "pl-greetings",
  languageId: "pl",
  levelId: "a1",
  type: "multiple-choice",
  order: 10,
  prompt: "Which greeting is polite?",
  instructionLanguage: "en",
  result: RESULT,
};

const EXERCISE = {
  id: "pl-greetings-polite-hello",
  lessonId: "pl-greetings",
  languageId: "pl",
  levelId: "a1",
  type: "multiple-choice",
  order: 10,
  prompt: "Which greeting is polite?",
  instructionLanguage: "en",
  options: [
    { id: "a", text: "Dzień dobry" },
    { id: "b", text: "Cześć" },
  ],
  result: RESULT,
};

const EVALUATION = {
  correct: true,
  feedback: "Dzień dobry is polite.",
  correctAnswer: "a",
  result: { status: "correct", attemptCount: 1, lastAnsweredAt: "2026-01-01T10:00:00.000Z" },
  rewards: { pointsAwarded: 0, achievementsUnlocked: [] },
};

function stub(status: number, body: unknown) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: status >= 200 && status < 300,
      status,
      json: () => Promise.resolve(body),
    }),
  );
}

function lastCall() {
  const [url, init] = vi.mocked(fetch).mock.calls[0] ?? [];
  return { url: url as string, init: init ?? {} };
}

beforeEach(() => {
  stub(200, {});
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("fetchLessonExercises", () => {
  it("GETs the lesson's exercises with the session cookie, asking for JSON", async () => {
    stub(200, { exercises: [SUMMARY], progress: { total: 1, answered: 0 } });

    const result = await fetchLessonExercises("pl-greetings");

    expect(result.exercises[0]?.id).toBe("pl-greetings-polite-hello");
    const { url, init } = lastCall();
    expect(url).toBe("/lessons/pl-greetings/exercises");
    expect(init.credentials).toBe("include");
    expect(init.headers).toMatchObject({ Accept: "application/json" });
    expect(init.method).toBeUndefined();
  });

  it("percent-encodes the id so it cannot add path segments or parameters", async () => {
    stub(200, { exercises: [], progress: { total: 0, answered: 0 } });

    await fetchLessonExercises("pl/../x?admin=1");

    expect(lastCall().url).toBe("/lessons/pl%2F..%2Fx%3Fadmin%3D1/exercises");
  });

  it("refuses a response that does not match the contract", async () => {
    stub(200, {
      exercises: [{ ...SUMMARY, type: "matching" }],
      progress: { total: 1, answered: 0 },
    });

    await expect(fetchLessonExercises("pl-greetings")).rejects.toThrow();
  });

  it("throws an ApiError carrying the API's safe message and status", async () => {
    stub(404, { error: "Lesson not found." });

    const failure = await fetchLessonExercises("pl-nope").catch((e: unknown) => e);

    expect(failure).toBeInstanceOf(ApiError);
    expect(failure).toMatchObject({ status: 404, message: "Lesson not found." });
  });
});

describe("fetchExercise", () => {
  it("GETs one exercise, validated against the presentation contract", async () => {
    stub(200, EXERCISE);

    const exercise = await fetchExercise("pl-greetings-polite-hello");

    expect(exercise.type).toBe("multiple-choice");
    expect(lastCall().url).toBe("/exercises/pl-greetings-polite-hello");
  });

  it("drops anything beyond the presentation shape, so an answer key that leaked would never reach a component", async () => {
    stub(200, { ...EXERCISE, correctOptionId: "a", explanation: "secret", configuration: {} });

    const exercise = await fetchExercise("pl-greetings-polite-hello");

    expect(JSON.stringify(exercise)).not.toMatch(
      /correctOptionId|explanation|secret|configuration/,
    );
  });

  it("falls back to a generic message when an error body is not the expected shape", async () => {
    stub(500, "<html>boom</html>");

    const failure = await fetchExercise("pl-x").catch((e: unknown) => e);

    expect(failure).toMatchObject({
      status: 500,
      message: "Something went wrong. Please try again.",
    });
  });
});

describe("submitAnswer", () => {
  it("POSTs only the answer as JSON, with the session cookie, and returns the server's verdict", async () => {
    stub(200, EVALUATION);

    const result = await submitAnswer("pl-greetings-polite-hello", "a");

    expect(result).toEqual(EVALUATION);
    const { url, init } = lastCall();
    expect(url).toBe("/exercises/pl-greetings-polite-hello/answer");
    expect(init.method).toBe("POST");
    expect(init.credentials).toBe("include");
    expect(init.headers).toMatchObject({
      "Content-Type": "application/json",
      Accept: "application/json",
    });
    expect(JSON.parse(init.body as string)).toEqual({ answer: "a" });
  });

  it.each([true, false, "Dziękuję", ""])("sends the answer %j exactly as given", async (answer) => {
    stub(200, EVALUATION);

    await submitAnswer("pl-x", answer);

    expect(JSON.parse(lastCall().init.body as string)).toEqual({ answer });
  });

  it("never sends a verdict, user, score or time — the body has one key", async () => {
    stub(200, EVALUATION);

    await submitAnswer("pl-x", "a");

    expect(Object.keys(JSON.parse(lastCall().init.body as string) as object)).toEqual(["answer"]);
  });

  it("refuses a verdict that does not match the contract", async () => {
    stub(200, { ...EVALUATION, correct: "yes" });

    await expect(submitAnswer("pl-x", "a")).rejects.toThrow();
  });

  it("throws an ApiError for an invalid answer, with the API's message", async () => {
    stub(400, { error: "Invalid answer." });

    const failure = await submitAnswer("pl-x", "zzz").catch((e: unknown) => e);

    expect(failure).toMatchObject({ status: 400, message: "Invalid answer." });
  });

  it("throws an ApiError with the status for a session that ended", async () => {
    stub(401, { error: "Unauthenticated" });

    const failure = await submitAnswer("pl-x", "a").catch((e: unknown) => e);

    expect(failure).toBeInstanceOf(ApiError);
    expect(failure).toMatchObject({ status: 401 });
  });
});
