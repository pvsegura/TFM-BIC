import { createLanguageId } from "../../language/language-id.js";
import { createLevelId } from "../../language/level-id.js";
import { createPhoneticRepresentationId } from "../phonetic-representation-id.js";
import type { PhoneticRepresentation } from "../phonetic-representation.js";
import { createPhoneticTopicId } from "../phonetic-topic-id.js";
import type { PhoneticTopic } from "../phonetic-topic.js";

/**
 * Builders for well-formed phonetics, shared by every layer's tests (through
 * `@tfm-bic/domain/testing`). Test-only: never import this from production code.
 */
export function makePhoneticTopic(overrides: Partial<PhoneticTopic> = {}): PhoneticTopic {
  return {
    id: createPhoneticTopicId("consonants"),
    languageId: createLanguageId("pl"),
    status: "published",
    order: 10,
    instructionLanguage: createLanguageId("en"),
    title: "Consonants",
    description: "Consonant sounds and how to produce them.",
    ...overrides,
  };
}

export function makePhoneticRepresentation(
  overrides: Partial<PhoneticRepresentation> = {},
): PhoneticRepresentation {
  return {
    id: createPhoneticRepresentationId("pl-ipa-ts"),
    languageId: createLanguageId("pl"),
    topicId: createPhoneticTopicId("consonants"),
    status: "published",
    order: 10,
    ipa: "t͡ʂ",
    description: "Voiceless retroflex affricate, spelled cz.",
    instructionLanguage: createLanguageId("en"),
    levelId: createLevelId("a1"),
    exampleWords: [{ word: "czas", translation: "time" }],
    ...overrides,
  };
}
