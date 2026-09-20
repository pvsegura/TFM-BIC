import { describe, expect, it } from "vitest";

import { createLanguageId } from "../language/language-id.js";
import { contentIdBelongsToLanguage, createContentId, isValidContentId } from "./content-id.js";
import { InvalidContentIdError } from "./errors/invalid-content-id.error.js";

describe("ContentId", () => {
  it.each(["pl-greetings", "pl-a1-greetings-2", "xx-test"])("accepts %s", (id) => {
    expect(isValidContentId(id)).toBe(true);
    expect(createContentId(id)).toBe(id);
  });

  it.each([
    "",
    "PL-greetings",
    "pl greetings",
    "pl_greetings",
    "-pl",
    "pl-",
    "pl--x",
    "1pl-x",
    "pl/x",
    "../../etc/passwd",
    "pl-<script>",
    "pl-x\n",
    `pl-${"a".repeat(64)}`,
  ])("rejects %j", (id) => {
    expect(isValidContentId(id)).toBe(false);
    expect(() => createContentId(id)).toThrow(InvalidContentIdError);
  });

  it("is namespaced by its language: the id must start with `<languageId>-`", () => {
    const pl = createLanguageId("pl");
    expect(contentIdBelongsToLanguage(createContentId("pl-greetings"), pl)).toBe(true);
    expect(contentIdBelongsToLanguage(createContentId("en-greetings"), pl)).toBe(false);
    expect(contentIdBelongsToLanguage(createContentId("plx-greetings"), pl)).toBe(false);
  });
});
