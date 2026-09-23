import { describe, expect, it } from "vitest";

import {
  MAX_PHONETIC_PAGE_SIZE,
  phoneticActionRequestSchema,
  phoneticIdParamSchema,
  phoneticListQuerySchema,
  phoneticListResponseSchema,
  phoneticRepresentationResponseSchema,
  phoneticTopicResponseSchema,
  phoneticTopicsQuerySchema,
  phoneticTopicsResponseSchema,
} from "./phonetic-response.schema.js";

const userProgress = {
  status: "viewed",
  firstViewedAt: "2026-01-01T10:00:00.000Z",
  lastViewedAt: "2026-01-01T10:00:00.000Z",
  practicedAt: null,
  completedAt: null,
};

const representation = {
  id: "pl-ipa-ts",
  languageId: "pl",
  topic: { id: "consonants", title: "Consonants" },
  ipa: "t͡ʂ",
  description: "Voiceless retroflex affricate, spelled cz.",
  instructionLanguage: "en",
  levelId: "a1",
  note: "Contrasts with ć.",
  exampleWords: [{ word: "czas", translation: "time" }],
  userProgress,
};

describe("phoneticRepresentationResponseSchema", () => {
  it("accepts a full representation with the student's own progress", () => {
    expect(phoneticRepresentationResponseSchema.parse(representation)).toEqual(representation);
  });

  it("accepts a representation with only the required fields and no progress yet", () => {
    const minimal = {
      id: "pl-ipa-ts",
      languageId: "pl",
      ipa: "t͡ʂ",
      description: "Voiceless retroflex affricate.",
      instructionLanguage: "en",
      userProgress: {
        status: "not_started",
        firstViewedAt: null,
        lastViewedAt: null,
        practicedAt: null,
        completedAt: null,
      },
    };

    expect(phoneticRepresentationResponseSchema.parse(minimal)).toEqual(minimal);
  });

  it("is an allowlist: a user id, a content status or a file path can never be serialised", () => {
    const parsed = phoneticRepresentationResponseSchema.parse({
      ...representation,
      userId: "u-1",
      status: "published",
      filePath: "content/x.json",
      userProgress: { ...userProgress, userId: "u-1" },
    });

    expect(parsed).toEqual(representation);
    expect(JSON.stringify(parsed)).not.toMatch(/userId|filePath|published/);
  });

  it.each([
    ["an unknown status", { userProgress: { ...userProgress, status: "mastered" } }],
    ["a malformed id", { id: "Pl-Ipa-Ts" }],
    ["a time that is not ISO 8601", { userProgress: { ...userProgress, lastViewedAt: "today" } }],
    ["a missing progress", { userProgress: undefined }],
    ["an empty IPA", { ipa: "" }],
  ])("rejects %s", (_name, overrides) => {
    expect(
      phoneticRepresentationResponseSchema.safeParse({ ...representation, ...overrides }).success,
    ).toBe(false);
  });
});

describe("phoneticListResponseSchema", () => {
  it("carries the page, how many representations match in all, and where the next page starts", () => {
    const page = { items: [representation], total: 14, nextAfter: "pl-ipa-ts" };

    expect(phoneticListResponseSchema.parse(page)).toEqual(page);
    expect(
      phoneticListResponseSchema.parse({ items: [], total: 0, nextAfter: null }).nextAfter,
    ).toBeNull();
  });
});

describe("phoneticTopicResponseSchema and phoneticTopicsResponseSchema", () => {
  const progress = { representationCount: 6, viewed: 3, practiced: 1, completed: 1 };
  const topic = {
    id: "consonants",
    languageId: "pl",
    title: "Consonants",
    description: "Consonant sounds and how to produce them.",
    instructionLanguage: "en",
    progress,
  };

  it("lists topics with the student's progress in each", () => {
    const body = { topics: [topic] };

    expect(phoneticTopicsResponseSchema.parse(body)).toEqual(body);
  });

  it("does not require a description", () => {
    const { description: _omitted, ...bare } = topic;

    expect(phoneticTopicResponseSchema.parse(bare)).not.toHaveProperty("description");
  });

  it("rejects a negative count", () => {
    expect(
      phoneticTopicResponseSchema.safeParse({ ...topic, progress: { ...progress, viewed: -1 } })
        .success,
    ).toBe(false);
  });
});

describe("phoneticListQuerySchema", () => {
  it("needs only the language, and supplies the default page size", () => {
    expect(phoneticListQuerySchema.parse({ language: "pl" })).toEqual({
      language: "pl",
      limit: 20,
    });
  });

  it("accepts every filter together", () => {
    expect(
      phoneticListQuerySchema.parse({
        language: "pl",
        level: "a1",
        topic: "consonants",
        status: "viewed",
        limit: "5",
        after: "pl-ipa-ts",
      }),
    ).toEqual({
      language: "pl",
      level: "a1",
      topic: "consonants",
      status: "viewed",
      limit: 5,
      after: "pl-ipa-ts",
    });
  });

  it.each([
    ["no language", {}],
    ["a malformed language", { language: "Polish" }],
    ["a level that is not CEFR", { language: "pl", level: "z9" }],
    ["a malformed topic", { language: "pl", topic: "Consonants!" }],
    ["a topic with a path", { language: "pl", topic: "../consonants" }],
    ["an unknown status", { language: "pl", status: "mastered" }],
    ["a limit of zero", { language: "pl", limit: "0" }],
    ["a limit above the maximum", { language: "pl", limit: String(MAX_PHONETIC_PAGE_SIZE + 1) }],
    ["a hexadecimal limit", { language: "pl", limit: "0x10" }],
    ["a negative limit", { language: "pl", limit: "-5" }],
    ["a malformed cursor", { language: "pl", after: "Pl-Ipa-Ts" }],
    ["a user id", { language: "pl", userId: "u-1" }],
    ["any other key", { language: "pl", sort: "ipa" }],
  ])("rejects %s", (_name, query) => {
    expect(phoneticListQuerySchema.safeParse(query).success).toBe(false);
  });

  it("accepts a limit of exactly the maximum", () => {
    expect(
      phoneticListQuerySchema.parse({ language: "pl", limit: String(MAX_PHONETIC_PAGE_SIZE) })
        .limit,
    ).toBe(MAX_PHONETIC_PAGE_SIZE);
  });
});

describe("phoneticTopicsQuerySchema", () => {
  it("takes the language and nothing else", () => {
    expect(phoneticTopicsQuerySchema.parse({ language: "pl" })).toEqual({ language: "pl" });
    expect(phoneticTopicsQuerySchema.safeParse({}).success).toBe(false);
    expect(phoneticTopicsQuerySchema.safeParse({ language: "pl", userId: "u-1" }).success).toBe(
      false,
    );
  });
});

describe("phoneticIdParamSchema", () => {
  it("accepts a language-prefixed slug", () => {
    expect(phoneticIdParamSchema.parse({ phoneticId: "pl-ipa-ts" })).toEqual({
      phoneticId: "pl-ipa-ts",
    });
  });

  it.each([
    "",
    "Pl-Ipa-Ts",
    "pl ipa ts",
    "pl/ipa/ts",
    "../etc/passwd",
    "'; DROP TABLE user_phonetic_progress;--",
  ])("rejects %j", (phoneticId) => {
    expect(phoneticIdParamSchema.safeParse({ phoneticId }).success).toBe(false);
  });
});

describe("phoneticActionRequestSchema", () => {
  it("accepts no body and an empty one", () => {
    expect(phoneticActionRequestSchema.safeParse(undefined).success).toBe(true);
    expect(phoneticActionRequestSchema.safeParse({}).success).toBe(true);
  });

  it.each(["userId", "status", "practicedAt", "completedAt", "role"])(
    "rejects a body naming %s, instead of ignoring it",
    (key) => {
      expect(phoneticActionRequestSchema.safeParse({ [key]: "x" }).success).toBe(false);
    },
  );
});
