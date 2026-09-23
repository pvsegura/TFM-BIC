import { describe, expect, it } from "vitest";

import {
  contentIdSchema,
  languageIdSchema,
  levelIdSchema,
  phoneticRepresentationIdSchema,
  phoneticTopicIdSchema,
} from "./identifiers.schema.js";

describe("languageIdSchema", () => {
  it.each(["pl", "en", "es", "de", "fr", "it", "pt"])("accepts %s", (code) => {
    expect(languageIdSchema.parse(code)).toBe(code);
  });

  it.each(["", "P", "POL", "polish", "p1", "pl-PL", "pl\n", "../pl", 1, null, undefined, ["pl"]])(
    "rejects %j",
    (value) => {
      expect(languageIdSchema.safeParse(value).success).toBe(false);
    },
  );
});

describe("levelIdSchema", () => {
  it.each(["a1", "a2", "b1", "b2", "c1", "c2"])("accepts %s", (id) => {
    expect(levelIdSchema.parse(id)).toBe(id);
  });

  it.each(["", "A1", "a3", "z9", "a1 ", "pre-a1", "constructor", 1, null])(
    "rejects %j",
    (value) => {
      expect(levelIdSchema.safeParse(value).success).toBe(false);
    },
  );
});

describe("contentIdSchema", () => {
  it("accepts a namespaced slug", () => {
    expect(contentIdSchema.parse("pl-greetings")).toBe("pl-greetings");
  });

  it.each([
    "",
    "PL-x",
    "pl_x",
    "pl/x",
    "../../etc/passwd",
    "pl-<script>",
    `pl-${"a".repeat(80)}`,
    5,
  ])("rejects %j", (value) => {
    expect(contentIdSchema.safeParse(value).success).toBe(false);
  });
});

describe("phoneticRepresentationIdSchema", () => {
  it("accepts a namespaced slug", () => {
    expect(phoneticRepresentationIdSchema.parse("pl-ipa-ts")).toBe("pl-ipa-ts");
  });

  it.each(["", "PL-x", "pl_x", "pl/x", "../../etc/passwd", "pl-<script>", 5])(
    "rejects %j",
    (value) => {
      expect(phoneticRepresentationIdSchema.safeParse(value).success).toBe(false);
    },
  );
});

describe("phoneticTopicIdSchema", () => {
  it.each(["consonants", "vowels", "stress-rules"])("accepts %s", (id) => {
    expect(phoneticTopicIdSchema.parse(id)).toBe(id);
  });

  it.each(["", "Consonants", "conso_nants", "conso/nants", "../etc/passwd", 5])(
    "rejects %j",
    (value) => {
      expect(phoneticTopicIdSchema.safeParse(value).success).toBe(false);
    },
  );
});
