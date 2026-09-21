import type { ContentStatus } from "../content/content-status.js";
import type { LanguageId } from "../language/language-id.js";
import type { LevelId } from "../language/level-id.js";
import type { GrammaticalGender } from "./grammatical-gender.js";
import type { PartOfSpeech } from "./part-of-speech.js";
import type { VocabularyCategoryId } from "./vocabulary-category-id.js";
import type { VocabularyItemId } from "./vocabulary-item-id.js";

/** A sentence using the word, with its meaning in the entry's `instructionLanguage`. */
export interface VocabularyExample {
  text: string;
  translation: string;
}

/**
 * One vocabulary entry: a word (or fixed phrase) of the language being learned, with what a
 * learner needs to recognise it. It is content, like a lesson or an exercise — data in a
 * validated file, identified by a permanent id — and it carries no language-specific behaviour:
 * `languageId` is just data, so the same model serves any language.
 *
 * Only the identity, the lemma and its meaning are required. Grammar (`partOfSpeech`, `gender`,
 * `plural`), a usage `note`, a `levelId` and an `example` are all optional, because they do not
 * make sense for every word or every language (a numeral has no plural, many languages have no
 * grammatical gender).
 *
 * **Lemma, not word form.** An entry is one lexical unit named by its dictionary form (`lemma`).
 * Its inflected forms are not separate entries and are not modelled in M9: `plural` is the one
 * inflection fact stored, because learners meet it first. A later milestone can add an optional
 * `forms` list to an entry (or a separate forms table keyed by the entry's id) without changing
 * this shape, the ids or a student's saved words, which all point at the entry.
 *
 * `levelId` is pedagogical metadata the author attached to the entry — where it is taught — not
 * a claim that the word is officially of that CEFR level.
 *
 * No timestamps: like all content, the file's history is Git's.
 */
export interface VocabularyItem {
  id: VocabularyItemId;
  languageId: LanguageId;
  categoryId: VocabularyCategoryId;
  status: ContentStatus;
  /** Position within its category; unique there, gaps allowed. */
  order: number;
  /** The word or phrase being learned, in its dictionary form, in the language being learned. */
  lemma: string;
  /** What it means, written in `instructionLanguage`. */
  translation: string;
  /** The language `translation`, `example.translation` and `note` are written in. */
  instructionLanguage: LanguageId;
  levelId?: LevelId | undefined;
  partOfSpeech?: PartOfSpeech | undefined;
  gender?: GrammaticalGender | undefined;
  /** The plural form, when the word has one worth showing. */
  plural?: string | undefined;
  /** A short usage or grammar remark, in `instructionLanguage`. */
  note?: string | undefined;
  example?: VocabularyExample | undefined;
}
