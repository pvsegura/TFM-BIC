import { describe, expect, it } from "vitest";

import { languageFileSchema } from "./language-file.schema.js";

const valid = {
  schemaVersion: 1,
  code: "pl",
  name: "Polish",
  nativeName: "polski",
  locale: "pl-PL",
  direction: "ltr",
  isActive: true,
  levels: [
    { id: "a1", status: "available" },
    { id: "a2", status: "planned" },
  ],
};

function without(key: string) {
  const copy: Record<string, unknown> = { ...valid };
  delete copy[key];
  return copy;
}

describe("languageFileSchema (language.json)", () => {
  it("accepts a valid language file", () => {
    const parsed = languageFileSchema.parse(valid);
    expect(parsed.code).toBe("pl");
    expect(parsed.levels).toHaveLength(2);
  });

  it.each([
    "schemaVersion",
    "code",
    "name",
    "nativeName",
    "locale",
    "direction",
    "isActive",
    "levels",
  ])("rejects a file missing %s", (key) => {
    expect(languageFileSchema.safeParse(without(key)).success).toBe(false);
  });

  it.each([
    ["an unsupported schemaVersion", { schemaVersion: 2 }],
    ["an invalid language code", { code: "POL" }],
    ["a code that is a name", { code: "polish" }],
    ["a locale of another language", { locale: "en-GB" }],
    ["a malformed locale", { locale: "pl_PL" }],
    ["an invalid direction", { direction: "auto" }],
    ["a non-boolean isActive", { isActive: "yes" }],
    ["an empty levels list", { levels: [] }],
    ["an invalid level id", { levels: [{ id: "a3", status: "available" }] }],
    ["an invalid level status", { levels: [{ id: "a1", status: "coming-soon" }] }],
    ["a level entry with an unexpected key", { levels: [{ id: "a1", status: "available", x: 1 }] }],
    ["an unexpected top-level key", { extra: true }],
    ["markup in the name", { name: "<b>Polish</b>" }],
    ["an oversized name", { name: "x".repeat(500) }],
  ])("rejects %s", (_label, override) => {
    expect(languageFileSchema.safeParse({ ...valid, ...override }).success).toBe(false);
  });

  it("supports right-to-left metadata even though no such language ships yet", () => {
    const arabic = {
      ...valid,
      code: "ar",
      name: "Arabic",
      nativeName: "العربية",
      locale: "ar-EG",
      direction: "rtl",
    };
    expect(languageFileSchema.parse(arabic).direction).toBe("rtl");
  });
});
