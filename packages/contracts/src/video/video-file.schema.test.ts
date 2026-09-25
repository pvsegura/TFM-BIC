import { describe, expect, it } from "vitest";

import { videoFileSchema } from "./video-file.schema.js";

function validFile(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    schemaVersion: 1,
    id: "pl-a1-nasal-vowels-demo",
    languageId: "pl",
    levelId: "a1",
    status: "published",
    order: 10,
    instructionLanguage: "en",
    title: "Nasal vowels: ą and ę",
    description: "A short demo video introducing Polish's two nasal vowels.",
    relatedContentId: "pl-ipa-onasal",
    scriptPath: "pl-a1-nasal-vowels-demo",
    ...overrides,
  };
}

describe("videoFileSchema", () => {
  it("accepts a well-formed definition and brands its id", () => {
    const parsed = videoFileSchema.parse(validFile());

    expect(parsed.id).toBe("pl-a1-nasal-vowels-demo");
    expect(parsed.languageId).toBe("pl");
    expect(parsed.scriptPath).toBe("pl-a1-nasal-vowels-demo");
  });

  it("accepts a definition with no relatedContentId: it is optional", () => {
    const file = validFile();
    delete file.relatedContentId;

    const parsed = videoFileSchema.parse(file);

    expect(parsed.relatedContentId).toBeUndefined();
  });

  it("rejects an unknown key", () => {
    expect(() =>
      videoFileSchema.parse(validFile({ audioUrl: "https://example.com/a.mp3" })),
    ).toThrow();
  });

  it("rejects a malformed id", () => {
    expect(() => videoFileSchema.parse(validFile({ id: "Not A Valid Id" }))).toThrow();
  });

  it("rejects a malformed scriptPath (no path separators allowed)", () => {
    expect(() => videoFileSchema.parse(validFile({ scriptPath: "../etc/passwd" }))).toThrow();
  });

  it("rejects a malformed relatedContentId", () => {
    expect(() => videoFileSchema.parse(validFile({ relatedContentId: "<script>" }))).toThrow();
  });

  it("rejects the wrong schema version", () => {
    expect(() => videoFileSchema.parse(validFile({ schemaVersion: 2 }))).toThrow();
  });
});
