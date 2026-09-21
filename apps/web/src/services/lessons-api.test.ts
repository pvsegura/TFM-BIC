import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "./api-error.js";
import { completeLesson, fetchLesson, fetchLessons, startLesson } from "./lessons-api.js";

const PROGRESS = { status: "not_started", startedAt: null, completedAt: null };

const SUMMARY = {
  id: "pl-greetings",
  languageId: "pl",
  levelId: "a1",
  title: "Greetings",
  description: "Say hello.",
  order: 10,
  instructionLanguage: "en",
  progress: PROGRESS,
};

const LESSON = {
  ...SUMMARY,
  blocks: [{ type: "explanation", text: "Polish has formal and informal greetings." }],
};

function mockFetch(status: number, body: unknown) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  });
}

function stub(status: number, body: unknown) {
  vi.stubGlobal("fetch", mockFetch(status, body));
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

describe("fetchLessons", () => {
  it("GETs /lessons with the language and level, sending the session cookie and asking for JSON", async () => {
    stub(200, { lessons: [SUMMARY] });

    const result = await fetchLessons("pl", "a1");

    expect(result.lessons[0]?.id).toBe("pl-greetings");
    const { url, init } = lastCall();
    expect(url).toBe("/lessons?language=pl&level=a1");
    expect(init.credentials).toBe("include");
    expect(init.headers).toMatchObject({ Accept: "application/json" });
    expect(init.method).toBeUndefined();
  });

  it("percent-encodes route values so they cannot add parameters", async () => {
    stub(200, { lessons: [] });

    await fetchLessons("pl&admin=1", "a1#x");

    expect(lastCall().url).toBe("/lessons?language=pl%26admin%3D1&level=a1%23x");
  });

  it("rejects a response that does not match the contract", async () => {
    stub(200, { lessons: [{ id: "pl-greetings" }] });

    await expect(fetchLessons("pl", "a1")).rejects.toThrow();
  });

  it("throws an ApiError carrying the status and the API's safe message", async () => {
    stub(404, { error: "Level not available." });

    await expect(fetchLessons("pl", "a2")).rejects.toMatchObject({
      name: "ApiError",
      status: 404,
      message: "Level not available.",
    });
  });

  it("throws a generic ApiError when an error body is not the documented shape", async () => {
    stub(500, { stack: "Error: at db.ts:12", sql: "SELECT ..." });

    const error = await fetchLessons("pl", "a1").catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).message).toBe("Something went wrong. Please try again.");
    expect((error as ApiError).status).toBe(500);
  });

  it("throws a generic ApiError when an error body is not JSON at all", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 502,
        json: () => Promise.reject(new SyntaxError("Unexpected token <")),
      }),
    );

    await expect(fetchLessons("pl", "a1")).rejects.toMatchObject({
      status: 502,
      message: "Something went wrong. Please try again.",
    });
  });

  it("reports a 401 so the caller can end the session", async () => {
    stub(401, { error: "Unauthenticated" });

    await expect(fetchLessons("pl", "a1")).rejects.toMatchObject({ status: 401 });
  });
});

describe("fetchLesson", () => {
  it("GETs /lessons/:lessonId with credentials and returns the lesson with its blocks", async () => {
    stub(200, LESSON);

    const lesson = await fetchLesson("pl-greetings");

    expect(lesson.blocks).toHaveLength(1);
    const { url, init } = lastCall();
    expect(url).toBe("/lessons/pl-greetings");
    expect(init.credentials).toBe("include");
  });

  it("percent-encodes the lesson id so it cannot add path segments", async () => {
    stub(200, LESSON);

    await fetchLesson("../secret?x=1");

    expect(lastCall().url).toBe("/lessons/..%2Fsecret%3Fx%3D1");
  });

  it("refuses a lesson containing a block type this version does not know", async () => {
    stub(200, { ...LESSON, blocks: [{ type: "exercise", prompt: "x" }] });

    await expect(fetchLesson("pl-greetings")).rejects.toThrow();
  });

  it("refuses a lesson whose text looks like markup", async () => {
    stub(200, {
      ...LESSON,
      blocks: [{ type: "explanation", text: "<img src=x onerror=alert(1)>" }],
    });

    await expect(fetchLesson("pl-greetings")).rejects.toThrow();
  });

  it("throws an ApiError with the status for a lesson that is not there", async () => {
    stub(404, { error: "Lesson not found." });

    await expect(fetchLesson("pl-missing")).rejects.toMatchObject({ status: 404 });
  });
});

describe.each([
  ["startLesson", startLesson, "start"],
  ["completeLesson", completeLesson, "complete"],
] as const)("%s", (_name, call, action) => {
  it(`POSTs /lessons/:lessonId/${action} with credentials and no body, and returns the persisted progress`, async () => {
    const persisted = {
      status: "completed",
      startedAt: "2026-01-01T10:00:00.000Z",
      completedAt: "2026-01-01T10:05:00.000Z",
    };
    stub(200, persisted);

    const result = await call("pl-greetings");

    expect(result).toEqual(persisted);
    const { url, init } = lastCall();
    expect(url).toBe(`/lessons/pl-greetings/${action}`);
    expect(init.method).toBe("POST");
    expect(init.credentials).toBe("include");
    // No body and no content type: the client tells the server nothing but which lesson.
    expect(init.body).toBeUndefined();
    expect(init.headers).not.toHaveProperty("Content-Type");
  });

  it("never sends a user id, a time or a status", async () => {
    stub(200, PROGRESS);

    await call("pl-greetings");

    const { url, init } = lastCall();
    expect(url).not.toMatch(/user|status|completedAt/i);
    expect(JSON.stringify(init)).not.toMatch(/userId|completedAt|status/);
  });

  it("throws an ApiError for a lesson that cannot be found", async () => {
    stub(404, { error: "Lesson not found." });

    await expect(call("pl-missing")).rejects.toMatchObject({ status: 404 });
  });

  it("rejects a response that is not a valid progress object", async () => {
    stub(200, { status: "done" });

    await expect(call("pl-greetings")).rejects.toThrow();
  });
});
