import { describe, expect, it } from "vitest";

import { phoneticFileSchema } from "./phonetic-file.schema.js";

function validFile(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    schemaVersion: 1,
    id: "consonants",
    languageId: "pl",
    status: "published",
    order: 10,
    instructionLanguage: "en",
    title: "Consonants",
    description: "Consonant sounds and how to produce them.",
    items: [
      {
        id: "pl-ipa-ts",
        status: "published",
        order: 10,
        ipa: "t͡ʂ",
        description: "Voiceless retroflex affricate, spelled cz.",
        levelId: "a1",
        note: "Contrasts with ć.",
        exampleWords: [{ word: "czas", translation: "time" }],
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

describe("phoneticFileSchema", () => {
  it("accepts a well-formed set and brands its identifiers", () => {
    const parsed = phoneticFileSchema.parse(validFile());

    expect(parsed.id).toBe("consonants");
    expect(parsed.languageId).toBe("pl");
    expect(parsed.items).toHaveLength(1);
    expect(parsed.items[0]?.ipa).toBe("t͡ʂ");
  });

  it("accepts an entry with only the required fields: level, note and example words are optional", () => {
    const parsed = phoneticFileSchema.parse(withoutKeys("levelId", "note", "exampleWords"));

    expect(parsed.items[0]).toEqual({
      id: "pl-ipa-ts",
      status: "published",
      order: 10,
      ipa: "t͡ʂ",
      description: "Voiceless retroflex affricate, spelled cz.",
    });
  });

  it("accepts a topic without a description", () => {
    expect(phoneticFileSchema.safeParse(validFile({ description: undefined })).success).toBe(true);
  });

  it("accepts an IPA transcription of any Unicode script, including affricates and diacritics", () => {
    for (const ipa of ["t͡ʂ", "ɕ", "ʐ", "ɲ", "ŋ", "ɣ", "ˈa", "ʲ"]) {
      expect(phoneticFileSchema.safeParse(withItem({ ipa })).success, ipa).toBe(true);
    }
  });

  it("accepts more than one example word", () => {
    const parsed = phoneticFileSchema.parse(
      withItem({
        exampleWords: [
          { word: "czas", translation: "time" },
          { word: "czapka", translation: "hat" },
        ],
      }),
    );

    expect(parsed.items[0]?.exampleWords).toHaveLength(2);
  });

  describe("rejects a set that", () => {
    it.each([
      ["has an unknown schema version", { schemaVersion: 2 }],
      ["has no schema version", { schemaVersion: undefined }],
      ["has an invalid topic id", { id: "Consonants!" }],
      ["has an id with a path separator", { id: "../consonants" }],
      ["has an invalid language id", { languageId: "Polish" }],
      ["has an unknown status", { status: "live" }],
      ["has an order of zero", { order: 0 }],
      ["has a fractional order", { order: 1.5 }],
      ["has an invalid instruction language", { instructionLanguage: "english" }],
      ["has an empty title", { title: "" }],
      ["has a title with markup", { title: "<b>Consonants</b>" }],
      ["has an over-long title", { title: "x".repeat(81) }],
      ["has an over-long description", { description: "x".repeat(301) }],
      ["has no entries", { items: [] }],
      ["has too many entries", { items: Array.from({ length: 501 }, () => ({})) }],
    ])("%s", (_name, overrides) => {
      expect(phoneticFileSchema.safeParse(validFile(overrides)).success).toBe(false);
    });

    it.each(["userId", "correct", "score", "learned", "status2"])(
      "carries the unlisted key %s at the top level",
      (key) => {
        expect(phoneticFileSchema.safeParse(validFile({ [key]: "x" })).success).toBe(false);
      },
    );
  });

  describe("rejects an entry that", () => {
    it.each([
      ["has an invalid id", { id: "Pl-Ipa-Ts" }],
      ["has an unknown status", { status: "live" }],
      ["has an order of zero", { order: 0 }],
      ["has an empty IPA", { ipa: "" }],
      ["has an IPA with a line break", { ipa: "t\ns" }],
      ["has an IPA with a control character", { ipa: "t" + String.fromCharCode(0) }],
      ["has an over-long IPA", { ipa: "x".repeat(41) }],
      ["has an empty description", { description: "" }],
      ["has a description with markup", { description: "<b>x</b>" }],
      ["has an over-long description", { description: "x".repeat(301) }],
      ["has a level that is not CEFR", { levelId: "z9" }],
      ["has an over-long note", { note: "x".repeat(201) }],
      ["has an example word without its translation", { exampleWords: [{ word: "czas" }] }],
      ["has an example word without its word", { exampleWords: [{ translation: "time" }] }],
      [
        "has an example word with an extra key",
        { exampleWords: [{ word: "a", translation: "b", audio: "x" }] },
      ],
      ["has an empty example words list", { exampleWords: [] }],
    ])("%s", (_name, overrides) => {
      expect(phoneticFileSchema.safeParse(withItem(overrides)).success).toBe(false);
    });

    it.each(["userId", "correct", "topicId", "languageId", "instructionLanguage", "audioUrl"])(
      "carries the unlisted key %s",
      (key) => {
        expect(phoneticFileSchema.safeParse(withItem({ [key]: "x" })).success).toBe(false);
      },
    );
  });

  it("does not let an entry override the language or instruction language it inherits", () => {
    expect(phoneticFileSchema.safeParse(withItem({ languageId: "en" })).success).toBe(false);
    expect(phoneticFileSchema.safeParse(withItem({ instructionLanguage: "es" })).success).toBe(
      false,
    );
  });
});
