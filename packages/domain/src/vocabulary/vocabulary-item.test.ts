import { describe, expect, it } from "vitest";

import { InvalidVocabularyCategoryIdError } from "./errors/invalid-vocabulary-category-id.error.js";
import { InvalidVocabularyItemIdError } from "./errors/invalid-vocabulary-item-id.error.js";
import { GRAMMATICAL_GENDERS, isValidGrammaticalGender } from "./grammatical-gender.js";
import { isValidPartOfSpeech, PARTS_OF_SPEECH } from "./part-of-speech.js";
import {
  createVocabularyCategoryId,
  isValidVocabularyCategoryId,
} from "./vocabulary-category-id.js";
import {
  createVocabularyItemId,
  isValidVocabularyItemId,
  vocabularyItemIdBelongsToLanguage,
} from "./vocabulary-item-id.js";

describe("VocabularyItemId", () => {
  it.each(["pl-dom", "pl-dzien-dobry", "xx-a1", "es-casa"])("accepts %s", (id) => {
    expect(isValidVocabularyItemId(id)).toBe(true);
    expect(createVocabularyItemId(id)).toBe(id);
  });

  it.each([
    "",
    "Pl-Dom",
    "pl_dom",
    "pl--dom",
    "-pl-dom",
    "pl-dom-",
    "1pl-dom",
    "pl dom",
    "pl/dom",
    "../etc/passwd",
    "<script>",
    "pl-dom'; DROP TABLE user_vocabulary;--",
    "pl-dzień",
    `pl-${"a".repeat(62)}`,
  ])("rejects %j", (id) => {
    expect(isValidVocabularyItemId(id)).toBe(false);
    expect(() => createVocabularyItemId(id)).toThrow(InvalidVocabularyItemIdError);
  });

  it("accepts an id of exactly 64 characters and rejects 65", () => {
    expect(isValidVocabularyItemId(`pl-${"a".repeat(61)}`)).toBe(true);
    expect(isValidVocabularyItemId(`pl-${"a".repeat(62)}`)).toBe(false);
  });

  it("is identity, not spelling: an id is a slug, so a lemma with diacritics needs its own ASCII id", () => {
    // "cześć" is the lemma; the id is whatever the author chose, never derived from it.
    expect(isValidVocabularyItemId("pl-czesc")).toBe(true);
    expect(isValidVocabularyItemId("pl-cześć")).toBe(false);
  });

  it("is namespaced by language, so a misfiled item can be detected", () => {
    const id = createVocabularyItemId("pl-dom");

    expect(vocabularyItemIdBelongsToLanguage(id, "pl" as never)).toBe(true);
    expect(vocabularyItemIdBelongsToLanguage(id, "en" as never)).toBe(false);
    expect(vocabularyItemIdBelongsToLanguage(id, "p" as never)).toBe(false);
  });
});

describe("VocabularyCategoryId", () => {
  it.each(["greetings", "family", "food", "travel", "numbers", "everyday-life"])(
    "accepts %s",
    (id) => {
      expect(isValidVocabularyCategoryId(id)).toBe(true);
      expect(createVocabularyCategoryId(id)).toBe(id);
    },
  );

  it.each(["", "Food", "food!", "food category", "-food", "food-", "1food", "../food", "food\n"])(
    "rejects %j",
    (id) => {
      expect(isValidVocabularyCategoryId(id)).toBe(false);
      expect(() => createVocabularyCategoryId(id)).toThrow(InvalidVocabularyCategoryIdError);
    },
  );

  it("is not language-prefixed: a category is a shared topic name that each language scopes itself", () => {
    expect(isValidVocabularyCategoryId("food")).toBe(true);
  });
});

describe("PartOfSpeech", () => {
  it("is a closed, language-neutral set", () => {
    expect(PARTS_OF_SPEECH).toEqual([
      "noun",
      "verb",
      "adjective",
      "adverb",
      "pronoun",
      "numeral",
      "preposition",
      "conjunction",
      "interjection",
      "particle",
      "phrase",
    ]);
  });

  it.each(PARTS_OF_SPEECH)("accepts %s", (value) => {
    expect(isValidPartOfSpeech(value)).toBe(true);
  });

  it.each(["", "Noun", "substantivo", "__proto__", "constructor", "toString"])(
    "rejects %j",
    (value) => {
      expect(isValidPartOfSpeech(value)).toBe(false);
    },
  );
});

describe("GrammaticalGender", () => {
  it("covers the genders languages use, and nothing is required of a language that has none", () => {
    expect(GRAMMATICAL_GENDERS).toEqual(["masculine", "feminine", "neuter", "common"]);
  });

  it.each(GRAMMATICAL_GENDERS)("accepts %s", (value) => {
    expect(isValidGrammaticalGender(value)).toBe(true);
  });

  it.each(["", "male", "Masculine", "__proto__"])("rejects %j", (value) => {
    expect(isValidGrammaticalGender(value)).toBe(false);
  });
});
