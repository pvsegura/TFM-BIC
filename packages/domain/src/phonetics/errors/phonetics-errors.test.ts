import { describe, expect, it } from "vitest";

import { PhoneticRepresentationNotFoundError } from "./phonetic-representation-not-found.error.js";
import { PhoneticTopicNotFoundError } from "./phonetic-topic-not-found.error.js";

describe("phonetics not-found errors", () => {
  it("name the representation that was asked for, for logs — the API never sends this message to a client", () => {
    const error = new PhoneticRepresentationNotFoundError("pl-ipa-ts");

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe("PhoneticRepresentationNotFoundError");
    expect(error.message).toBe('Phonetic representation "pl-ipa-ts" was not found.');
  });

  it("name the topic and the language that was asked for", () => {
    const error = new PhoneticTopicNotFoundError("pl", "consonants");

    expect(error.name).toBe("PhoneticTopicNotFoundError");
    expect(error.message).toBe('Phonetic topic "consonants" was not found in language "pl".');
  });
});
