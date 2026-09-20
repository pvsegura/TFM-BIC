import { describe, expect, it } from "vitest";

import { createLanguageId } from "./language-id.js";
import { isValidLocaleForLanguage, isValidTextDirection, TEXT_DIRECTIONS } from "./language.js";

describe("text direction", () => {
  it("supports left-to-right and right-to-left", () => {
    expect(TEXT_DIRECTIONS).toEqual(["ltr", "rtl"]);
  });

  it.each(["ltr", "rtl"])("accepts %s", (direction) => {
    expect(isValidTextDirection(direction)).toBe(true);
  });

  it.each(["", "LTR", "auto", "left"])("rejects %j", (direction) => {
    expect(isValidTextDirection(direction)).toBe(false);
  });
});

describe("locale", () => {
  const pl = createLanguageId("pl");

  it("accepts a regional locale whose primary language is the language", () => {
    expect(isValidLocaleForLanguage("pl-PL", pl)).toBe(true);
    expect(isValidLocaleForLanguage("pl", pl)).toBe(true);
  });

  it("keeps language and locale distinct: a locale of another language is rejected", () => {
    expect(isValidLocaleForLanguage("en-GB", pl)).toBe(false);
  });

  it.each(["", "pl_PL", "pl-", "not a locale", "pl-PL-<script>", "pl-PL\n"])(
    "rejects the malformed tag %j",
    (tag) => {
      expect(isValidLocaleForLanguage(tag, pl)).toBe(false);
    },
  );
});
