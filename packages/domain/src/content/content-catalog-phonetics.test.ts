import { describe, expect, it } from "vitest";

import { createLanguageId } from "../language/language-id.js";
import { createLevelId } from "../language/level-id.js";
import type { Language } from "../language/language.js";
import type { LanguageLevel } from "../language/language-level.js";
import {
  makePhoneticRepresentation,
  makePhoneticTopic,
} from "../phonetics/test-support/phonetics-fixtures.js";
import { createPhoneticRepresentationId } from "../phonetics/phonetic-representation-id.js";
import type { PhoneticRepresentation } from "../phonetics/phonetic-representation.js";
import { createPhoneticTopicId } from "../phonetics/phonetic-topic-id.js";
import type { PhoneticTopic } from "../phonetics/phonetic-topic.js";
import { validateContentCatalog, type ContentCatalog } from "./content-catalog.js";
import { createContentId } from "./content-id.js";
import type { ContentItem } from "./content-item.js";

const PL = createLanguageId("pl");
const XX = createLanguageId("xx");
const A1 = createLevelId("a1");
const A2 = createLevelId("a2");

const language = (code: typeof PL): Language => ({
  code,
  name: code,
  nativeName: code,
  locale: code,
  direction: "ltr",
  isActive: true,
});

const levels: LanguageLevel[] = [
  { languageId: PL, levelId: A1, status: "available" },
  { languageId: PL, levelId: A2, status: "planned" },
  { languageId: XX, levelId: A1, status: "available" },
];

/** One published lesson per language, so every `available` level has published content. */
const content: ContentItem[] = [PL, XX].map((languageId) => ({
  id: createContentId(`${languageId}-lesson`),
  languageId,
  levelId: A1,
  type: "lesson",
  status: "published",
  order: 10,
  instructionLanguage: createLanguageId("en"),
  title: "A lesson",
  description: "A lesson.",
  blocks: [{ type: "explanation", text: "Text." }],
}));

function catalog(
  phoneticTopics: PhoneticTopic[],
  phonetics: PhoneticRepresentation[],
): ContentCatalog {
  return {
    languages: [language(PL), language(XX)],
    languageLevels: levels,
    content,
    exercises: [],
    vocabularyCategories: [],
    vocabulary: [],
    phoneticTopics,
    phonetics,
    videoDefinitions: [],
  };
}

const messages = (c: ContentCatalog) => validateContentCatalog(c).map((issue) => issue.message);

const topic = makePhoneticTopic;
const representation = makePhoneticRepresentation;

describe("validateContentCatalog — phonetics", () => {
  it("accepts a catalog whose representations all belong to a published topic of their own language", () => {
    const result = catalog(
      [topic(), topic({ id: createPhoneticTopicId("vowels"), order: 20 })],
      [
        representation(),
        representation({ id: createPhoneticRepresentationId("pl-ipa-tc"), order: 20 }),
        representation({
          id: createPhoneticRepresentationId("pl-ipa-a"),
          topicId: createPhoneticTopicId("vowels"),
          ipa: "a",
        }),
      ],
    );

    expect(validateContentCatalog(result)).toEqual([]);
  });

  it("accepts a catalog with no phonetics at all", () => {
    expect(validateContentCatalog(catalog([], []))).toEqual([]);
  });

  it("accepts a representation with no topic: the topic is optional metadata", () => {
    const { topicId: _omitted, ...withoutTopic } = representation();

    expect(validateContentCatalog(catalog([], [withoutTopic]))).toEqual([]);
  });

  it("accepts a representation with no level: the level is optional metadata", () => {
    const { levelId: _omitted, ...withoutLevel } = representation();

    expect(validateContentCatalog(catalog([topic()], [withoutLevel]))).toEqual([]);
  });

  it("lets two languages use the same topic id, each with its own representations", () => {
    const result = catalog(
      [topic(), topic({ languageId: XX })],
      [
        representation(),
        representation({ id: createPhoneticRepresentationId("xx-ipa-ts"), languageId: XX }),
      ],
    );

    expect(validateContentCatalog(result)).toEqual([]);
  });

  it("rejects a topic id used twice by one language", () => {
    const result = catalog([topic(), topic({ order: 20 })], [representation()]);

    expect(messages(result)).toContain('Duplicate phonetic topic "consonants" in language "pl".');
  });

  it("rejects a topic of an unknown language", () => {
    const result = catalog([topic({ languageId: createLanguageId("zz") })], []);

    expect(messages(result)).toContain(
      'Phonetic topic "consonants" references unknown language "zz".',
    );
  });

  it("rejects two topics of one language sharing an order", () => {
    const result = catalog(
      [topic(), topic({ id: createPhoneticTopicId("vowels") })],
      [
        representation(),
        representation({
          id: createPhoneticRepresentationId("pl-ipa-a"),
          topicId: createPhoneticTopicId("vowels"),
        }),
      ],
    );

    expect(messages(result)).toContain('Phonetic topic "vowels" reuses order 10 in language "pl".');
  });

  it("rejects duplicate representation ids across the whole catalog", () => {
    const result = catalog([topic()], [representation(), representation({ order: 20 })]);

    expect(messages(result)).toContain('Duplicate phonetic representation id "pl-ipa-ts".');
  });

  it("rejects a representation of an unknown language", () => {
    const result = catalog(
      [topic()],
      [
        representation({
          id: createPhoneticRepresentationId("zz-ipa-ts"),
          languageId: createLanguageId("zz"),
        }),
      ],
    );

    expect(messages(result)).toContain(
      'Phonetic representation "zz-ipa-ts" references unknown language "zz".',
    );
  });

  it("rejects a representation id that does not start with its language id", () => {
    const result = catalog(
      [topic()],
      [representation({ id: createPhoneticRepresentationId("xx-ipa-ts") })],
    );

    expect(messages(result)).toContain(
      'Phonetic representation id "xx-ipa-ts" must start with its language id "pl-".',
    );
  });

  it("rejects a representation whose topic does not exist", () => {
    const result = catalog(
      [topic()],
      [representation({ topicId: createPhoneticTopicId("vowels") })],
    );

    expect(messages(result)).toContain(
      'Phonetic representation "pl-ipa-ts" references unknown topic "vowels" in language "pl".',
    );
  });

  it("rejects two representations of one topic sharing an order", () => {
    const result = catalog(
      [topic()],
      [
        representation(),
        representation({ id: createPhoneticRepresentationId("pl-ipa-a"), ipa: "a" }),
      ],
    );

    expect(messages(result)).toContain(
      'Phonetic representation "pl-ipa-a" reuses order 10 in topic "consonants" of "pl".',
    );
  });

  it("rejects a representation level its language does not declare", () => {
    const result = catalog([topic()], [representation({ levelId: createLevelId("c2") })]);

    expect(messages(result)).toContain(
      'Phonetic representation "pl-ipa-ts" is in level "c2", which language "pl" does not declare.',
    );
  });

  it("rejects a published representation in a level that is not available", () => {
    const result = catalog([topic()], [representation({ levelId: A2 })]);

    expect(messages(result)).toContain(
      'Published phonetic representation "pl-ipa-ts" is in pl/a2, which is not available.',
    );
  });

  it("rejects a published representation belonging to a topic that is not published", () => {
    const result = catalog([topic({ status: "draft" })], [representation()]);

    expect(messages(result)).toContain(
      'Published phonetic representation "pl-ipa-ts" belongs to topic "consonants", which is not published.',
    );
  });

  it("rejects a published topic with no published representations", () => {
    const result = catalog([topic()], [representation({ status: "draft" })]);

    expect(messages(result)).toContain(
      'Phonetic topic "consonants" of "pl" is published but has no published representations.',
    );
  });
});
