import type { ContentStatus } from "../content/content-status.js";
import type { LanguageId } from "../language/language-id.js";
import type { PhoneticRepresentationId } from "./phonetic-representation-id.js";
import type { PhoneticTopicId } from "./phonetic-topic-id.js";

/** One word illustrating the sound, with its meaning in the entry's `instructionLanguage`. */
export interface PhoneticExampleWord {
  word: string;
  translation: string;
}

/**
 * One phonetic representation: a sound, transcription or pronunciation note for the language
 * being learned. It is content, like a lesson, exercise or vocabulary entry — data in a
 * validated file, identified by a permanent id — and it carries no language-specific behaviour:
 * `languageId` is just data, so the same model serves any language.
 *
 * Only the identity, the IPA transcription and a description are required. `topicId` and
 * `exampleWords` are optional, because not every representation needs a grouping or an example.
 *
 * **Independent of Vocabulary.** A representation does not reference a `VocabularyItemId`: an
 * `exampleWords` entry is free text (a word and its meaning), not a link into the vocabulary
 * catalog, so the two contexts stay decoupled and neither can break the other.
 *
 * No timestamps: like all content, the file's history is Git's.
 */
export interface PhoneticRepresentation {
  id: PhoneticRepresentationId;
  languageId: LanguageId;
  status: ContentStatus;
  /** Position within its topic (or, without one, its language); unique there, gaps allowed. */
  order: number;
  /** The IPA transcription, as Unicode text — never an image, never a hard-coded symbol table. */
  ipa: string;
  /** What the sound is and how to produce it, written in `instructionLanguage`. */
  description: string;
  /** The language `description`, `exampleWords[].translation` and `note` are written in. */
  instructionLanguage: LanguageId;
  topicId?: PhoneticTopicId | undefined;
  /** A short usage or contrast remark, in `instructionLanguage`. */
  note?: string | undefined;
  exampleWords?: PhoneticExampleWord[] | undefined;
}
