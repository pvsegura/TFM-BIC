import { describe, expect, it } from "vitest";

import {
  deleteAccountRequestSchema,
  personalDataExportQuerySchema,
  personalDataExportSchema,
} from "./privacy.schema.js";

const EXPORT = {
  exportVersion: "1",
  generatedAt: "2026-09-26T10:00:00.000Z",
  account: {
    userId: "11111111-1111-4111-8111-111111111111",
    email: "ada@example.com",
    role: "STUDENT",
    emailVerified: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-02T00:00:00.000Z",
  },
  profile: null,
  learning: {
    lessons: [
      {
        lessonId: "pl-greetings",
        status: "completed",
        startedAt: "2026-02-01T00:00:00.000Z",
        completedAt: "2026-02-02T00:00:00.000Z",
        updatedAt: "2026-02-02T00:00:00.000Z",
      },
    ],
    exerciseAttempts: [
      {
        exerciseId: "pl-greetings-choice",
        submittedAnswer: true,
        correct: false,
        answeredAt: "2026-02-01T01:00:00.000Z",
      },
    ],
  },
  vocabulary: { items: [] },
  phonetics: { items: [] },
  gamification: { totalPoints: 0, pointTransactions: [], achievements: [] },
  media: { videoGenerationJobs: [] },
  communication: { essentialEmails: "always-on", newsletter: null },
  teaching: { linkedTeachers: [], linkedStudentCount: 0 },
  notIncluded: ["Your password hash."],
};

describe("personalDataExportSchema", () => {
  it("accepts a version-1 export", () => {
    expect(personalDataExportSchema.safeParse(EXPORT).success).toBe(true);
  });

  it("strips any field outside the documented shape (e.g. a password hash)", () => {
    const parsed = personalDataExportSchema.parse({
      ...EXPORT,
      passwordHash: "argon2id$...",
      account: { ...EXPORT.account, passwordHash: "argon2id$...", normalizedEmail: "x" },
    });

    expect(JSON.stringify(parsed)).not.toContain("argon2id");
    expect(parsed.account).not.toHaveProperty("normalizedEmail");
  });

  it("rejects an unknown export version", () => {
    expect(personalDataExportSchema.safeParse({ ...EXPORT, exportVersion: "2" }).success).toBe(
      false,
    );
  });

  it("rejects a timestamp that is not ISO 8601", () => {
    expect(
      personalDataExportSchema.safeParse({ ...EXPORT, generatedAt: "26/09/2026" }).success,
    ).toBe(false);
  });
});

describe("deleteAccountRequestSchema", () => {
  it("accepts the password with an explicit confirmation", () => {
    expect(
      deleteAccountRequestSchema.safeParse({ password: "secret", confirm: true }).success,
    ).toBe(true);
  });

  it.each([
    ["no confirmation", { password: "secret" }],
    ["confirm: false", { password: "secret", confirm: false }],
    ["a truthy non-boolean confirmation", { password: "secret", confirm: "yes" }],
    ["an empty password", { password: "", confirm: true }],
    ["an over-long password", { password: "x".repeat(129), confirm: true }],
    [
      "a user id (the account always comes from the session)",
      {
        password: "secret",
        confirm: true,
        userId: "11111111-1111-4111-8111-111111111111",
      },
    ],
    ["an email", { password: "secret", confirm: true, email: "x@example.com" }],
  ])("rejects %s", (_label, body) => {
    expect(deleteAccountRequestSchema.safeParse(body).success).toBe(false);
  });
});

describe("personalDataExportQuerySchema", () => {
  it("accepts no parameters and refuses any, a user id included", () => {
    expect(personalDataExportQuerySchema.safeParse({}).success).toBe(true);
    expect(personalDataExportQuerySchema.safeParse({ userId: "x" }).success).toBe(false);
  });
});
