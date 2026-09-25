import {
  createContentId,
  createExerciseId,
  createLanguageId,
  createPhoneticRepresentationId,
  createPhoneticTopicId,
  createVideoDefinitionId,
  createVocabularyCategoryId,
  createVocabularyItemId,
  isValidContentId,
  isValidExerciseId,
  isValidLanguageId,
  isValidPhoneticRepresentationId,
  isValidPhoneticTopicId,
  isValidVideoDefinitionId,
  isValidVocabularyCategoryId,
  isValidVocabularyItemId,
  LEVEL_IDS,
} from "@tfm-bic/domain";
import { z } from "zod";

/**
 * Identifier schemas built on the domain's own predicates and constructors, so
 * the file format, the API and the domain can never disagree about what a
 * valid id is. Each one outputs the branded domain type.
 */
export const languageIdSchema = z
  .string()
  .refine(isValidLanguageId, { error: "Expected a lowercase ISO 639 language code such as pl." })
  .transform(createLanguageId);

export const levelIdSchema = z.enum(LEVEL_IDS, { error: "Expected a CEFR level id (a1 to c2)." });

export const contentIdSchema = z
  .string()
  .refine(isValidContentId, { error: "Expected a lowercase slug such as pl-greetings." })
  .transform(createContentId);

/** An exercise's permanent id — the same strict slug rules as a content id, as its own branded type. */
export const exerciseIdSchema = z
  .string()
  .refine(isValidExerciseId, { error: "Expected a lowercase slug such as pl-greetings-hello." })
  .transform(createExerciseId);

/** A vocabulary entry's permanent id — a language-prefixed slug such as `pl-dom`, as its own branded type. */
export const vocabularyItemIdSchema = z
  .string()
  .refine(isValidVocabularyItemId, { error: "Expected a lowercase slug such as pl-dom." })
  .transform(createVocabularyItemId);

/** A vocabulary category (topic) id — a plain lowercase slug such as `food`. */
export const vocabularyCategoryIdSchema = z
  .string()
  .refine(isValidVocabularyCategoryId, { error: "Expected a lowercase slug such as food." })
  .transform(createVocabularyCategoryId);

/** A phonetic representation's permanent id — a language-prefixed slug such as `pl-ipa-ts`. */
export const phoneticRepresentationIdSchema = z
  .string()
  .refine(isValidPhoneticRepresentationId, {
    error: "Expected a lowercase slug such as pl-ipa-ts.",
  })
  .transform(createPhoneticRepresentationId);

/** A phonetic topic id — a plain lowercase slug such as `consonants`. */
export const phoneticTopicIdSchema = z
  .string()
  .refine(isValidPhoneticTopicId, { error: "Expected a lowercase slug such as consonants." })
  .transform(createPhoneticTopicId);

/** A video definition's permanent id — a language-prefixed slug such as `pl-a1-nasal-vowels-demo`. */
export const videoDefinitionIdSchema = z
  .string()
  .refine(isValidVideoDefinitionId, {
    error: "Expected a lowercase slug such as pl-a1-nasal-vowels-demo.",
  })
  .transform(createVideoDefinitionId);
