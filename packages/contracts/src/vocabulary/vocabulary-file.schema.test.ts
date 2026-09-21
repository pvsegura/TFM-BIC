import { describe, expect, it } from "vitest";

import { vocabularyFileSchema } from "./vocabulary-file.schema.js";

function validFile(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    schemaVersion: 1,
    id: "everyday",
    languageId: "pl",
    status: "published",
    order: 10,
    instructionLanguage: "en",
    title: "Everyday words",
    description: "Words for daily life.",
    items: [
      {
        id: "pl-dom",
        status: "published",
        order: 10,
        lemma: "dom",
        translation: "house; home",
        levelId: "a1",
        partOfSpeech: "noun",
        gender: "masculine",
        plural: "domy",
        note: "Also used for a building where people live.",
        example: { text: "Mój dom jest mały.", translation: "My house is small." },
      },
    ],
    ...overrides,
  };
}

function withItem(overrides: Record<string, unknown>): Record<string, unknown> {
  const [first] = validFile().items as Record<string, unknown>[];
  return validFile({ items: [{ ...first, ...overrides }] });
}

function withoutKeys(...keys: string[]): Record<string, unknown> {
  const [first] = validFile().items as Record<string, unknown>[];
  const item = { ...first };
  for (const key of keys) {
    delete item[key];
  }
  return validFile({ items: [item] });
}

describe("vocabularyFileSchema", () => {
  it("accepts a well-formed set and brands its identifiers", () => {
    const parsed = vocabularyFileSchema.parse(validFile());

    expect(parsed.id).toBe("everyday");
    expect(parsed.languageId).toBe("pl");
    expect(parsed.items).toHaveLength(1);
    expect(parsed.items[0]?.lemma).toBe("dom");
  });

  it("accepts an entry with only the required fields: grammar, level, note and example are optional", () => {
    const parsed = vocabularyFileSchema.parse(
      withoutKeys("levelId", "partOfSpeech", "gender", "plural", "note", "example"),
    );

    expect(parsed.items[0]).toEqual({
      id: "pl-dom",
      status: "published",
      order: 10,
      lemma: "dom",
      translation: "house; home",
    });
  });

  it("accepts a category without a description", () => {
    expect(vocabularyFileSchema.safeParse(validFile({ description: undefined })).success).toBe(
      true,
    );
  });

  it("accepts Unicode of any script in words and meanings: the product is multilingual", () => {
    for (const lemma of ["cześć", "Łódź", "casa", "Haus", "李", "شكرا"]) {
      expect(vocabularyFileSchema.safeParse(withItem({ lemma })).success, lemma).toBe(true);
    }
  });

  describe("rejects a set that", () => {
    it.each([
      ["has an unknown schema version", { schemaVersion: 2 }],
      ["has no schema version", { schemaVersion: undefined }],
      ["has an invalid category id", { id: "Food!" }],
      ["has an id with a path separator", { id: "../food" }],
      ["has an invalid language id", { languageId: "Polish" }],
      ["has an unknown status", { status: "live" }],
      ["has an order of zero", { order: 0 }],
      ["has a fractional order", { order: 1.5 }],
      ["has an invalid instruction language", { instructionLanguage: "english" }],
      ["has an empty title", { title: "" }],
      ["has a title with markup", { title: "<b>Food</b>" }],
      ["has an over-long title", { title: "x".repeat(81) }],
      ["has an over-long description", { description: "x".repeat(301) }],
      ["has no entries", { items: [] }],
      ["has too many entries", { items: Array.from({ length: 501 }, () => ({})) }],
    ])("%s", (_name, overrides) => {
      expect(vocabularyFileSchema.safeParse(validFile(overrides)).success).toBe(false);
    });

    it.each(["userId", "correct", "score", "learned", "status2"])(
      "carries the unlisted key %s at the top level",
      (key) => {
        expect(vocabularyFileSchema.safeParse(validFile({ [key]: "x" })).success).toBe(false);
      },
    );
  });

  describe("rejects an entry that", () => {
    it.each([
      ["has an invalid id", { id: "Pl-Dom" }],
      ["has an id derived from a diacritic lemma", { id: "pl-dzień" }],
      ["has an unknown status", { status: "live" }],
      ["has an order of zero", { order: 0 }],
      ["has an empty lemma", { lemma: "" }],
      ["has a lemma with a line break", { lemma: "dom\nkot" }],
      ["has a lemma with a control character", { lemma: "dom" + String.fromCharCode(0) }],
      ["has a lemma with leading whitespace", { lemma: " dom" }],
      ["has a lemma with markup", { lemma: "<script>x</script>" }],
      ["has an over-long lemma", { lemma: "x".repeat(81) }],
      ["has an empty translation", { translation: "" }],
      ["has an over-long translation", { translation: "x".repeat(121) }],
      ["has a level that is not CEFR", { levelId: "z9" }],
      ["has an unknown part of speech", { partOfSpeech: "substantivo" }],
      ["has an unknown gender", { gender: "male" }],
      ["has an empty plural", { plural: "" }],
      ["has an over-long note", { note: "x".repeat(201) }],
      ["has an example without its translation", { example: { text: "Dom." } }],
      ["has an example without its text", { example: { translation: "House." } }],
      [
        "has an example with an extra key",
        { example: { text: "a", translation: "b", audio: "x" } },
      ],
      ["has an over-long example", { example: { text: "x".repeat(201), translation: "b" } }],
    ])("%s", (_name, overrides) => {
      expect(vocabularyFileSchema.safeParse(withItem(overrides)).success).toBe(false);
    });

    it.each(["userId", "correct", "categoryId", "languageId", "learned", "audioUrl", "ipa"])(
      "carries the unlisted key %s",
      (key) => {
        expect(vocabularyFileSchema.safeParse(withItem({ [key]: "x" })).success).toBe(false);
      },
    );
  });

  it("does not let an entry override the language, category or instruction language it inherits", () => {
    expect(vocabularyFileSchema.safeParse(withItem({ languageId: "en" })).success).toBe(false);
    expect(vocabularyFileSchema.safeParse(withItem({ instructionLanguage: "es" })).success).toBe(
      false,
    );
  });
});
