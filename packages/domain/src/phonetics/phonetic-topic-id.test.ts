import { describe, expect, it } from "vitest";

import { InvalidPhoneticTopicIdError } from "./errors/invalid-phonetic-topic-id.error.js";
import { createPhoneticTopicId, isValidPhoneticTopicId } from "./phonetic-topic-id.js";

describe("PhoneticTopicId", () => {
  it.each(["consonants", "vowels", "stress-rules", "a1"])("accepts %s", (id) => {
    expect(isValidPhoneticTopicId(id)).toBe(true);
    expect(createPhoneticTopicId(id)).toBe(id);
  });

  it.each([
    "",
    "Consonants",
    "conso_nants",
    "conso--nants",
    "-consonants",
    "consonants-",
    "1consonants",
    "conso nants",
    "conso/nants",
    "../etc/passwd",
    "<script>",
    "consonants'; DROP TABLE phonetic_topics;--",
    `${"a".repeat(65)}`,
  ])("rejects %j", (id) => {
    expect(isValidPhoneticTopicId(id)).toBe(false);
    expect(() => createPhoneticTopicId(id)).toThrow(InvalidPhoneticTopicIdError);
  });

  it("accepts an id of exactly 64 characters and rejects 65", () => {
    expect(isValidPhoneticTopicId("a".repeat(64))).toBe(true);
    expect(isValidPhoneticTopicId("a".repeat(65))).toBe(false);
  });
});
