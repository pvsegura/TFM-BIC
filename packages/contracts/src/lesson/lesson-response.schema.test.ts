import { describe, expect, it } from "vitest";

import {
  lessonActionRequestSchema,
  lessonCompletionResponseSchema,
  lessonIdParamSchema,
  lessonListQuerySchema,
  lessonListResponseSchema,
  lessonProgressResponseSchema,
  lessonResponseSchema,
} from "./lesson-response.schema.js";

const notStarted = { status: "not_started", startedAt: null, completedAt: null };
const completed = {
  status: "completed",
  startedAt: "2026-01-01T10:00:00.000Z",
  completedAt: "2026-01-01T10:05:00.000Z",
};

const summary = {
  id: "pl-greetings",
  languageId: "pl",
  levelId: "a1",
  title: "Greetings",
  description: "Say hello.",
  order: 10,
  instructionLanguage: "en",
  progress: notStarted,
};

describe("lessonProgressResponseSchema", () => {
  it("accepts each status the student can see", () => {
    expect(lessonProgressResponseSchema.parse(notStarted).status).toBe("not_started");
    expect(
      lessonProgressResponseSchema.parse({
        status: "in_progress",
        startedAt: "2026-01-01T10:00:00.000Z",
        completedAt: null,
      }).status,
    ).toBe("in_progress");
    expect(lessonProgressResponseSchema.parse(completed).status).toBe("completed");
  });

  it("rejects a status that does not exist", () => {
    expect(lessonProgressResponseSchema.safeParse({ ...notStarted, status: "done" }).success).toBe(
      false,
    );
  });

  it("rejects a time that is not an ISO date-time", () => {
    expect(
      lessonProgressResponseSchema.safeParse({ ...completed, completedAt: "yesterday" }).success,
    ).toBe(false);
  });

  it("strips anything beyond the documented shape, such as the user id (allowlist)", () => {
    const parsed = lessonProgressResponseSchema.parse({
      ...completed,
      userId: "user-1",
      updatedAt: "2026-01-01T10:05:00.000Z",
    });

    expect(parsed).toEqual(completed);
  });
});

describe("lessonListResponseSchema", () => {
  it("accepts a list of lesson summaries with progress", () => {
    expect(lessonListResponseSchema.parse({ lessons: [summary] }).lessons).toHaveLength(1);
  });

  it("accepts an empty list", () => {
    expect(lessonListResponseSchema.parse({ lessons: [] }).lessons).toEqual([]);
  });

  it("strips the body and internal metadata if a use case result ever carried them", () => {
    const parsed = lessonListResponseSchema.parse({
      lessons: [
        {
          ...summary,
          blocks: [{ type: "explanation", text: "x" }],
          status: "draft",
          type: "lesson",
        },
      ],
    });

    expect(parsed.lessons[0]).toEqual(summary);
  });
});

describe("lessonResponseSchema", () => {
  it("accepts a lesson with its blocks and progress", () => {
    const parsed = lessonResponseSchema.parse({
      ...summary,
      blocks: [
        { type: "explanation", text: "Polish has more than one greeting." },
        { type: "example", text: "Cześć!", translation: "Hi!" },
      ],
    });

    expect(parsed.blocks).toHaveLength(2);
    expect(parsed.progress).toEqual(notStarted);
  });

  it("rejects a block type it does not know, so an unknown type never reaches the UI", () => {
    expect(
      lessonResponseSchema.safeParse({ ...summary, blocks: [{ type: "exercise", prompt: "x" }] })
        .success,
    ).toBe(false);
  });

  it("rejects a block whose text looks like markup", () => {
    expect(
      lessonResponseSchema.safeParse({
        ...summary,
        blocks: [{ type: "explanation", text: "<script>alert(1)</script>" }],
      }).success,
    ).toBe(false);
  });
});

describe("lessonListQuerySchema", () => {
  it("accepts a language and a level", () => {
    expect(lessonListQuerySchema.parse({ language: "pl", level: "a1" })).toEqual({
      language: "pl",
      level: "a1",
    });
  });

  it("requires both", () => {
    expect(lessonListQuerySchema.safeParse({ language: "pl" }).success).toBe(false);
    expect(lessonListQuerySchema.safeParse({ level: "a1" }).success).toBe(false);
  });

  it.each([
    ["an uppercase language", { language: "PL", level: "a1" }],
    ["a path-like language", { language: "../pl", level: "a1" }],
    ["an injection-like language", { language: "pl' OR '1'='1", level: "a1" }],
    ["a level that is not CEFR", { language: "pl", level: "z9" }],
    ["a repeated parameter", { language: ["pl", "en"], level: "a1" }],
  ])("rejects %s", (_name, query) => {
    expect(lessonListQuerySchema.safeParse(query).success).toBe(false);
  });

  it("ignores unrelated parameters such as cache busters", () => {
    expect(lessonListQuerySchema.parse({ language: "pl", level: "a1", _: "123" })).toEqual({
      language: "pl",
      level: "a1",
    });
  });
});

describe("lessonIdParamSchema", () => {
  it("accepts a content-id-shaped lesson id", () => {
    expect(lessonIdParamSchema.parse({ lessonId: "pl-greetings" }).lessonId).toBe("pl-greetings");
  });

  it.each([
    "PL-Greetings",
    "../etc/passwd",
    "pl-greetings; DROP TABLE lesson_progress",
    "pl greetings",
    "-pl",
    "",
    "a".repeat(65),
  ])("rejects the malformed id %j", (lessonId) => {
    expect(lessonIdParamSchema.safeParse({ lessonId }).success).toBe(false);
  });
});

describe("lessonActionRequestSchema", () => {
  it("accepts no body at all", () => {
    expect(lessonActionRequestSchema.safeParse(undefined).success).toBe(true);
  });

  it("accepts an empty object", () => {
    expect(lessonActionRequestSchema.safeParse({}).success).toBe(true);
  });

  it.each([
    ["userId", { userId: "someone-else" }],
    ["completedAt", { completedAt: "1999-01-01T00:00:00.000Z" }],
    ["status", { status: "completed" }],
    ["lessonId", { lessonId: "pl-other" }],
    ["role", { role: "TEACHER" }],
  ])("rejects a body that tries to set %s: the client controls none of it", (_field, body) => {
    expect(lessonActionRequestSchema.safeParse(body).success).toBe(false);
  });
});

describe("lessonCompletionResponseSchema", () => {
  const rewards = { pointsAwarded: 25, achievementsUnlocked: [] };

  it("is the progress the lesson now has, plus what completing it earned", () => {
    const parsed = lessonCompletionResponseSchema.parse({ ...completed, rewards });
    expect(parsed.status).toBe("completed");
    expect(parsed.rewards).toEqual(rewards);
  });

  it("requires the rewards", () => {
    expect(lessonCompletionResponseSchema.safeParse(completed).success).toBe(false);
  });

  it("strips anything beyond that shape, such as the user id (allowlist)", () => {
    const parsed = lessonCompletionResponseSchema.parse({ ...completed, rewards, userId: "u1" });
    expect(parsed).not.toHaveProperty("userId");
  });
});
