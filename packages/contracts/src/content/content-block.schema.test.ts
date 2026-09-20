import { describe, expect, it } from "vitest";

import { contentBlockSchema, plainText } from "./content-block.schema.js";

describe("plainText", () => {
  const schema = plainText(20);

  it("accepts ordinary text, including diacritics and non-Latin scripts", () => {
    expect(schema.parse("Dzień dobry")).toBe("Dzień dobry");
    expect(schema.parse("Łódź, 你好")).toBe("Łódź, 你好");
  });

  it("accepts punctuation that merely resembles markup, but is not a tag", () => {
    expect(schema.parse("5 < 6 & 7 > 3")).toBe("5 < 6 & 7 > 3");
  });

  it.each([
    ["empty", ""],
    ["over the length limit", "x".repeat(201)],
    ["leading space", " x"],
    ["trailing space", "x "],
    ["a newline", "a\nb"],
    ["a NUL byte", "a\x00b"],
    ["a DEL byte", "a\x7fb"],
    ["a script tag", "<script>alert(1)</script>"],
    ["an image tag with a handler", '<img src=x onerror="alert(1)">'],
    ["a closing tag", "text</b>"],
    ["an HTML comment", "<!-- x -->"],
  ])("rejects %s", (_label, value) => {
    expect(plainText(200).safeParse(value).success).toBe(false);
  });

  it("rejects non-strings", () => {
    expect(schema.safeParse(42).success).toBe(false);
    expect(schema.safeParse(null).success).toBe(false);
  });
});

describe("contentBlockSchema", () => {
  it("accepts an explanation block", () => {
    expect(
      contentBlockSchema.parse({ type: "explanation", text: "Polish has no articles." }),
    ).toEqual({ type: "explanation", text: "Polish has no articles." });
  });

  it("accepts an example block, with and without a note", () => {
    const base = { type: "example", text: "Cześć!", translation: "Hi!" };
    expect(contentBlockSchema.parse(base)).toEqual(base);
    expect(contentBlockSchema.parse({ ...base, note: "Informal." })).toEqual({
      ...base,
      note: "Informal.",
    });
  });

  it("accepts a dialogue block", () => {
    const block = {
      type: "dialogue",
      lines: [{ speaker: "Anna", text: "Cześć!", translation: "Hi!" }],
    };
    expect(contentBlockSchema.parse(block)).toEqual(block);
  });

  it.each([
    ["an unknown type", { type: "video", url: "https://example.com/x.mp4" }],
    ["a script-shaped type", { type: "script", code: "alert(1)" }],
    ["no type", { text: "x" }],
    ["an example without a translation", { type: "example", text: "Cześć!" }],
    ["an empty dialogue", { type: "dialogue", lines: [] }],
    [
      "a dialogue line without a speaker",
      { type: "dialogue", lines: [{ text: "a", translation: "b" }] },
    ],
    ["an unexpected extra property", { type: "explanation", text: "x", html: "<b>x</b>" }],
    ["markup in an explanation", { type: "explanation", text: "<b>bold</b>" }],
    [
      "markup in a dialogue line",
      { type: "dialogue", lines: [{ speaker: "A", text: "<i>x</i>", translation: "y" }] },
    ],
    [
      "too many dialogue lines",
      {
        type: "dialogue",
        lines: Array.from({ length: 41 }, () => ({ speaker: "A", text: "x", translation: "y" })),
      },
    ],
  ])("rejects %s", (_label, block) => {
    expect(contentBlockSchema.safeParse(block).success).toBe(false);
  });
});
