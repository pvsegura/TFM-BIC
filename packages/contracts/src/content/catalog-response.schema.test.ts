import { describe, expect, it } from "vitest";

import {
  catalogErrorResponseSchema,
  contentListQuerySchema,
  contentListResponseSchema,
  contentResponseSchema,
  languageCodeParamSchema,
  languageLevelsResponseSchema,
  languagesResponseSchema,
} from "./catalog-response.schema.js";

const language = {
  code: "pl",
  name: "Polish",
  nativeName: "polski",
  locale: "pl-PL",
  direction: "ltr",
};

const summary = {
  id: "pl-greetings",
  languageId: "pl",
  levelId: "a1",
  type: "lesson",
  title: "Greetings",
  description: "Say hello.",
  order: 10,
  instructionLanguage: "en",
};

describe("languagesResponseSchema", () => {
  it("accepts a list of languages", () => {
    expect(languagesResponseSchema.parse({ languages: [language] }).languages).toHaveLength(1);
  });

  it("strips anything that is not part of the public shape (allowlist)", () => {
    const parsed = languagesResponseSchema.parse({
      languages: [
        { ...language, isActive: true, internalNote: "secret", filePath: "/srv/content" },
      ],
    });
    expect(parsed.languages[0]).toEqual(language);
  });

  it("rejects a language with an invalid direction", () => {
    expect(
      languagesResponseSchema.safeParse({ languages: [{ ...language, direction: "up" }] }).success,
    ).toBe(false);
  });
});

describe("languageLevelsResponseSchema", () => {
  it("accepts a language with its levels and their availability", () => {
    const parsed = languageLevelsResponseSchema.parse({
      language,
      levels: [
        { id: "a1", label: "A1", status: "available" },
        { id: "a2", label: "A2", status: "planned" },
      ],
    });
    expect(parsed.levels.map((level) => level.status)).toEqual(["available", "planned"]);
  });

  it("rejects an unknown level id or status", () => {
    const bad = (level: object) =>
      languageLevelsResponseSchema.safeParse({ language, levels: [level] }).success;
    expect(bad({ id: "z9", label: "Z9", status: "available" })).toBe(false);
    expect(bad({ id: "a1", label: "A1", status: "draft" })).toBe(false);
  });
});

describe("content responses", () => {
  it("accepts a list of summaries without bodies", () => {
    expect(contentListResponseSchema.parse({ items: [summary] }).items).toHaveLength(1);
  });

  it("never includes internal metadata such as status or blocks in a summary", () => {
    const parsed = contentListResponseSchema.parse({
      items: [{ ...summary, status: "draft", blocks: [{ type: "explanation", text: "x" }] }],
    });
    expect(parsed.items[0]).toEqual(summary);
  });

  it("accepts a full item with its blocks, and still hides status", () => {
    const full = { ...summary, blocks: [{ type: "example", text: "Cześć!", translation: "Hi!" }] };
    expect(contentResponseSchema.parse({ ...full, status: "published" })).toEqual(full);
  });

  it("rejects a full item containing an unknown block type", () => {
    const full = { ...summary, blocks: [{ type: "video", src: "x" }] };
    expect(contentResponseSchema.safeParse(full).success).toBe(false);
  });
});

describe("request parameters", () => {
  it("accepts a valid content query", () => {
    expect(contentListQuerySchema.parse({ language: "pl", level: "a1" })).toEqual({
      language: "pl",
      level: "a1",
    });
  });

  it.each([
    ["a missing level", { language: "pl" }],
    ["a missing language", { level: "a1" }],
    ["an invalid level", { language: "pl", level: "a3" }],
    ["an invalid language", { language: "Polish", level: "a1" }],
    ["an injection-shaped language", { language: "pl' OR '1'='1", level: "a1" }],
    ["a repeated (array) parameter", { language: ["pl", "en"], level: "a1" }],
    ["a path-traversal language", { language: "../..", level: "a1" }],
  ])("rejects %s", (_label, query) => {
    expect(contentListQuerySchema.safeParse(query).success).toBe(false);
  });

  it("ignores unrelated query parameters (e.g. tracking params)", () => {
    expect(contentListQuerySchema.parse({ language: "pl", level: "a1", utm_source: "x" })).toEqual({
      language: "pl",
      level: "a1",
    });
  });

  it("validates the :languageCode path parameter", () => {
    expect(languageCodeParamSchema.safeParse({ languageCode: "pl" }).success).toBe(true);
    expect(languageCodeParamSchema.safeParse({ languageCode: "PL" }).success).toBe(false);
    expect(languageCodeParamSchema.safeParse({ languageCode: "pl%00" }).success).toBe(false);
  });
});

describe("catalogErrorResponseSchema", () => {
  it("is just a safe message", () => {
    expect(catalogErrorResponseSchema.parse({ error: "Not found.", stack: "x" })).toEqual({
      error: "Not found.",
    });
  });
});
