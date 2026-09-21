import { describe, expect, it } from "vitest";

import { VocabularyCategoryNotFoundError } from "./vocabulary-category-not-found.error.js";
import { VocabularyItemNotFoundError } from "./vocabulary-item-not-found.error.js";

describe("vocabulary not-found errors", () => {
  it("name the item that was asked for, for logs — the API never sends this message to a client", () => {
    const error = new VocabularyItemNotFoundError("pl-dom");

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe("VocabularyItemNotFoundError");
    expect(error.message).toBe('Vocabulary item "pl-dom" was not found.');
  });

  it("name the category and the language that was asked for", () => {
    const error = new VocabularyCategoryNotFoundError("pl", "food");

    expect(error.name).toBe("VocabularyCategoryNotFoundError");
    expect(error.message).toBe('Vocabulary category "food" was not found in language "pl".');
  });
});
