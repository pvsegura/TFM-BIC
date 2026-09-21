import { describe, expect, it } from "vitest";

import {
  MAX_VOCABULARY_PAGE_SIZE,
  userVocabularyQuerySchema,
  vocabularyActionRequestSchema,
  vocabularyCategoriesQuerySchema,
  vocabularyCategoriesResponseSchema,
  vocabularyIdParamSchema,
  vocabularyItemResponseSchema,
  vocabularyListQuerySchema,
  vocabularyListResponseSchema,
  vocabularyStatusRequestSchema,
} from "./vocabulary-response.schema.js";

const userState = {
  status: "saved",
  createdAt: "2026-01-01T10:00:00.000Z",
  updatedAt: "2026-01-01T10:00:00.000Z",
  learnedAt: null,
};

const item = {
  id: "pl-dom",
  languageId: "pl",
  category: { id: "everyday", title: "Everyday words" },
  lemma: "dom",
  translation: "house; home",
  instructionLanguage: "en",
  levelId: "a1",
  partOfSpeech: "noun",
  gender: "masculine",
  plural: "domy",
  note: "A building where people live.",
  example: { text: "Mój dom jest mały.", translation: "My house is small." },
  userState,
};

describe("vocabularyItemResponseSchema", () => {
  it("accepts a full entry with the student's own state", () => {
    expect(vocabularyItemResponseSchema.parse(item)).toEqual(item);
  });

  it("accepts an entry with only the required fields and a word the student has not touched", () => {
    const minimal = {
      id: "pl-dom",
      languageId: "pl",
      category: { id: "everyday", title: "Everyday words" },
      lemma: "dom",
      translation: "house",
      instructionLanguage: "en",
      userState: { status: "new", createdAt: null, updatedAt: null, learnedAt: null },
    };

    expect(vocabularyItemResponseSchema.parse(minimal)).toEqual(minimal);
  });

  it("is an allowlist: a user id, a status or a file path can never be serialised", () => {
    const parsed = vocabularyItemResponseSchema.parse({
      ...item,
      userId: "u-1",
      status: "published",
      filePath: "content/x.json",
      userState: { ...userState, userId: "u-1" },
    });

    expect(parsed).toEqual(item);
    expect(JSON.stringify(parsed)).not.toMatch(/userId|filePath|published/);
  });

  it.each([
    ["an unknown status", { userState: { ...userState, status: "mastered" } }],
    ["a malformed id", { id: "Pl-Dom" }],
    ["a time that is not ISO 8601", { userState: { ...userState, createdAt: "yesterday" } }],
    ["an unknown part of speech", { partOfSpeech: "thing" }],
    ["a missing state", { userState: undefined }],
  ])("rejects %s", (_name, overrides) => {
    expect(vocabularyItemResponseSchema.safeParse({ ...item, ...overrides }).success).toBe(false);
  });
});

describe("vocabularyListResponseSchema", () => {
  it("carries the page, how many entries match in all, and where the next page starts", () => {
    const page = { items: [item], total: 41, nextAfter: "pl-dom" };

    expect(vocabularyListResponseSchema.parse(page)).toEqual(page);
    expect(
      vocabularyListResponseSchema.parse({ items: [], total: 0, nextAfter: null }).nextAfter,
    ).toBeNull();
  });
});

describe("vocabularyCategoriesResponseSchema", () => {
  const progress = { itemCount: 8, saved: 2, learning: 1, learned: 3 };
  const category = {
    id: "everyday",
    languageId: "pl",
    title: "Everyday words",
    description: "Words for daily life.",
    instructionLanguage: "en",
    progress,
  };

  it("lists categories with the student's progress in each and in the language as a whole", () => {
    const body = {
      categories: [category],
      progress: { itemCount: 8, saved: 2, learning: 1, learned: 3 },
    };

    expect(vocabularyCategoriesResponseSchema.parse(body)).toEqual(body);
  });

  it("does not require a description", () => {
    const { description: _omitted, ...bare } = category;
    const body = { categories: [bare], progress };

    expect(vocabularyCategoriesResponseSchema.parse(body).categories[0]).not.toHaveProperty(
      "description",
    );
  });

  it("rejects a negative count", () => {
    const body = { categories: [{ ...category, progress: { ...progress, saved: -1 } }], progress };

    expect(vocabularyCategoriesResponseSchema.safeParse(body).success).toBe(false);
  });
});

describe("vocabularyListQuerySchema", () => {
  it("needs only the language, and supplies the default page size", () => {
    expect(vocabularyListQuerySchema.parse({ language: "pl" })).toEqual({
      language: "pl",
      limit: 20,
    });
  });

  it("accepts every filter together", () => {
    expect(
      vocabularyListQuerySchema.parse({
        language: "pl",
        level: "a1",
        category: "everyday",
        status: "new",
        q: "dom",
        limit: "5",
        after: "pl-dom",
      }),
    ).toEqual({
      language: "pl",
      level: "a1",
      category: "everyday",
      status: "new",
      q: "dom",
      limit: 5,
      after: "pl-dom",
    });
  });

  it("trims the search term and keeps its Unicode", () => {
    expect(vocabularyListQuerySchema.parse({ language: "pl", q: "  cześć " }).q).toBe("cześć");
  });

  it.each([
    ["no language", {}],
    ["a malformed language", { language: "Polish" }],
    ["a level that is not CEFR", { language: "pl", level: "z9" }],
    ["a malformed category", { language: "pl", category: "Food!" }],
    ["a category with a path", { language: "pl", category: "../food" }],
    ["an unknown status", { language: "pl", status: "mastered" }],
    ["an empty search", { language: "pl", q: "" }],
    ["a blank search", { language: "pl", q: "   " }],
    ["an over-long search", { language: "pl", q: "x".repeat(51) }],
    ["a search with a control character", { language: "pl", q: "a" + String.fromCharCode(0) }],
    ["a search given twice", { language: "pl", q: ["a", "b"] }],
    ["a limit of zero", { language: "pl", limit: "0" }],
    ["a limit above the maximum", { language: "pl", limit: String(MAX_VOCABULARY_PAGE_SIZE + 1) }],
    ["a limit in exponent form", { language: "pl", limit: "1e1" }],
    ["a hexadecimal limit", { language: "pl", limit: "0x10" }],
    ["a negative limit", { language: "pl", limit: "-5" }],
    ["a malformed cursor", { language: "pl", after: "Pl-Dom" }],
    ["a user id", { language: "pl", userId: "u-1" }],
    ["any other key", { language: "pl", sort: "lemma" }],
  ])("rejects %s", (_name, query) => {
    expect(vocabularyListQuerySchema.safeParse(query).success).toBe(false);
  });

  it("accepts a limit of exactly the maximum", () => {
    expect(
      vocabularyListQuerySchema.parse({ language: "pl", limit: String(MAX_VOCABULARY_PAGE_SIZE) })
        .limit,
    ).toBe(MAX_VOCABULARY_PAGE_SIZE);
  });
});

describe("userVocabularyQuerySchema", () => {
  it("filters by the stored statuses only: `new` is a word with no record, and there is nothing of the student's to list", () => {
    for (const status of ["saved", "learning", "learned"]) {
      expect(userVocabularyQuerySchema.parse({ language: "pl", status }).status).toBe(status);
    }
    expect(userVocabularyQuerySchema.safeParse({ language: "pl", status: "new" }).success).toBe(
      false,
    );
  });

  it("otherwise takes the same filters and rejects the same things", () => {
    expect(userVocabularyQuerySchema.parse({ language: "pl" })).toEqual({
      language: "pl",
      limit: 20,
    });
    expect(userVocabularyQuerySchema.safeParse({ language: "pl", userId: "u-1" }).success).toBe(
      false,
    );
    expect(userVocabularyQuerySchema.safeParse({}).success).toBe(false);
  });
});

describe("vocabularyCategoriesQuerySchema", () => {
  it("takes the language and nothing else", () => {
    expect(vocabularyCategoriesQuerySchema.parse({ language: "pl" })).toEqual({ language: "pl" });
    expect(vocabularyCategoriesQuerySchema.safeParse({}).success).toBe(false);
    expect(
      vocabularyCategoriesQuerySchema.safeParse({ language: "pl", userId: "u-1" }).success,
    ).toBe(false);
  });
});

describe("vocabularyIdParamSchema", () => {
  it("accepts a language-prefixed slug", () => {
    expect(vocabularyIdParamSchema.parse({ vocabularyId: "pl-dom" })).toEqual({
      vocabularyId: "pl-dom",
    });
  });

  it.each([
    "",
    "Pl-Dom",
    "pl dom",
    "pl/dom",
    "../etc/passwd",
    "'; DROP TABLE user_vocabulary;--",
    "pl-dzień",
  ])("rejects %j", (vocabularyId) => {
    expect(vocabularyIdParamSchema.safeParse({ vocabularyId }).success).toBe(false);
  });
});

describe("vocabularyStatusRequestSchema", () => {
  it.each(["saved", "learning", "learned"])("accepts %s", (status) => {
    expect(vocabularyStatusRequestSchema.parse({ status })).toEqual({ status });
  });

  it.each([
    ["new: a word goes back to new by being removed", { status: "new" }],
    ["an unknown status", { status: "mastered" }],
    ["no status", {}],
    ["a status that is not a string", { status: 1 }],
    ["a user id", { status: "saved", userId: "u-1" }],
    ["a learned time", { status: "learned", learnedAt: "2026-01-01T00:00:00.000Z" }],
    ["an item id", { status: "saved", vocabularyItemId: "pl-dom" }],
  ])("rejects %s", (_name, body) => {
    expect(vocabularyStatusRequestSchema.safeParse(body).success).toBe(false);
  });

  it("rejects no body at all: a status change must say which status", () => {
    expect(vocabularyStatusRequestSchema.safeParse(undefined).success).toBe(false);
  });
});

describe("vocabularyActionRequestSchema", () => {
  it("accepts no body and an empty one", () => {
    expect(vocabularyActionRequestSchema.safeParse(undefined).success).toBe(true);
    expect(vocabularyActionRequestSchema.safeParse({}).success).toBe(true);
  });

  it.each(["userId", "status", "learnedAt", "createdAt", "role"])(
    "rejects a body naming %s, instead of ignoring it",
    (key) => {
      expect(vocabularyActionRequestSchema.safeParse({ [key]: "x" }).success).toBe(false);
    },
  );
});
