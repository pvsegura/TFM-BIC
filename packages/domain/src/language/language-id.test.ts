import { describe, expect, it } from "vitest";

import { InvalidLanguageIdError } from "./invalid-language-id.error.js";
import { createLanguageId, isValidLanguageId } from "./language-id.js";

describe("LanguageId", () => {
  it("accepts a valid lowercase ISO-style code", () => {
    expect(createLanguageId("pl")).toBe("pl");
  });

  it("reports valid codes as valid via isValidLanguageId", () => {
    expect(isValidLanguageId("pl")).toBe(true);
    expect(isValidLanguageId("eng")).toBe(true);
  });

  it.each(["", "P", "POL", "polish", "p1", "pl-PL"])(
    "rejects %j as an invalid languageId",
    (invalid) => {
      expect(isValidLanguageId(invalid)).toBe(false);
      expect(() => createLanguageId(invalid)).toThrow(InvalidLanguageIdError);
    },
  );
});
