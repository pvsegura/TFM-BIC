import { describe, expect, it } from "vitest";

import { contentFileSchema } from "./content-file.schema.js";

const valid = {
  schemaVersion: 1,
  id: "pl-greetings",
  languageId: "pl",
  levelId: "a1",
  type: "lesson",
  status: "published",
  order: 10,
  instructionLanguage: "en",
  title: "Greetings",
  description: "Say hello and goodbye.",
  blocks: [
    { type: "explanation", text: "Polish has formal and informal greetings." },
    { type: "example", text: "Cześć!", translation: "Hi!" },
  ],
};

function without(key: string) {
  const copy: Record<string, unknown> = { ...valid };
  delete copy[key];
  return copy;
}

describe("contentFileSchema (content item file)", () => {
  it("accepts a valid content file", () => {
    const parsed = contentFileSchema.parse(valid);
    expect(parsed.id).toBe("pl-greetings");
    expect(parsed.blocks).toHaveLength(2);
  });

  it.each(["draft", "published", "archived"])("accepts the status %s", (status) => {
    expect(contentFileSchema.safeParse({ ...valid, status }).success).toBe(true);
  });

  it.each([
    "schemaVersion",
    "id",
    "languageId",
    "levelId",
    "type",
    "status",
    "order",
    "instructionLanguage",
    "title",
    "description",
    "blocks",
  ])("rejects a file missing %s", (key) => {
    expect(contentFileSchema.safeParse(without(key)).success).toBe(false);
  });

  it.each([
    ["an unsupported schemaVersion", { schemaVersion: 0 }],
    ["a display title used as an id", { id: "Greetings and goodbyes" }],
    ["an invalid language id", { languageId: "Polish" }],
    ["an invalid level id", { levelId: "A1" }],
    ["an invalid content type", { type: "polish-lesson" }],
    ["an invalid status", { status: "live" }],
    ["a zero order", { order: 0 }],
    ["a negative order", { order: -1 }],
    ["a fractional order", { order: 1.5 }],
    ["a string order", { order: "10" }],
    ["an enormous order", { order: 1e9 }],
    ["an invalid instruction language", { instructionLanguage: "english" }],
    ["an empty title", { title: "" }],
    ["an oversized title", { title: "x".repeat(121) }],
    ["an oversized description", { description: "x".repeat(301) }],
    ["a script tag in the title", { title: "<script>alert(1)</script>" }],
    ["no blocks", { blocks: [] }],
    [
      "too many blocks",
      { blocks: Array.from({ length: 51 }, () => ({ type: "explanation", text: "x" })) },
    ],
    ["an unknown block type", { blocks: [{ type: "video", src: "x" }] }],
    ["an unexpected top-level key", { html: "<b>x</b>" }],
    ["a __proto__ key", JSON.parse('{"__proto__": {"admin": true}}') as object],
  ])("rejects %s", (_label, override) => {
    expect(contentFileSchema.safeParse({ ...valid, ...override }).success).toBe(false);
  });

  it("does not let a malformed file through by coercion", () => {
    expect(contentFileSchema.safeParse({ ...valid, order: "10", status: 1 }).success).toBe(false);
    expect(contentFileSchema.safeParse(null).success).toBe(false);
    expect(contentFileSchema.safeParse("pl-greetings").success).toBe(false);
  });
});
