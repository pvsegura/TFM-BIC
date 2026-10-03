import type { Brand } from "@tfm-bic/shared";

import { isValidContentId } from "../content/content-id.js";
import type { ContentStatus } from "../content/content-status.js";
import type { LanguageId } from "../language/language-id.js";
import type { LevelId } from "../language/level-id.js";

/**
 * The grammar reference (M23): quick-lookup pages — pronouns, conjugations, time adverbs, word
 * formation — that a student consults while learning, separate from the lessons that teach. Read
 * from `content/languages/<languageId>/grammar/<topicId>.json`, one file per topic. Read-only
 * content: no progress is kept, so nothing here is personal data.
 */

/** A topic's permanent id: a language-prefixed slug such as `pl-ref-personal-pronouns`. */
export type GrammarTopicId = Brand<string, "GrammarTopicId">;

export class InvalidGrammarTopicIdError extends Error {
  constructor(value: string) {
    super(
      `"${value}" is not a valid grammarTopicId (expected lowercase letters, digits and single hyphens, starting with a letter, at most 64 characters).`,
    );
    this.name = "InvalidGrammarTopicIdError";
  }
}

/** No published grammar topic has this id. */
export class GrammarTopicNotFoundError extends Error {
  constructor(grammarTopicId: string) {
    super(`Grammar topic "${grammarTopicId}" was not found.`);
    this.name = "GrammarTopicNotFoundError";
  }
}

export function isValidGrammarTopicId(value: string): boolean {
  return isValidContentId(value);
}

export function createGrammarTopicId(value: string): GrammarTopicId {
  if (!isValidGrammarTopicId(value)) {
    throw new InvalidGrammarTopicIdError(value);
  }
  return value as GrammarTopicId;
}

/** The shelves of the reference, in display order. Data, never branched on per language. */
export const GRAMMAR_CATEGORIES = [
  "verbs",
  "pronouns",
  "nouns",
  "adjectives",
  "adverbs",
  "prepositions",
  "numbers",
  "connectors",
  "word-formation",
] as const;
export type GrammarCategory = (typeof GRAMMAR_CATEGORIES)[number];

/** A table of forms: a header row and body rows of exactly as many cells. */
export interface GrammarTable {
  caption?: string | undefined;
  columns: string[];
  rows: string[][];
}

export interface GrammarExample {
  text: string;
  translation: string;
  note?: string | undefined;
}

/** One part of a topic: any mix of a heading, a short text, a table and examples. */
export interface GrammarSection {
  heading?: string | undefined;
  text?: string | undefined;
  table?: GrammarTable | undefined;
  examples?: GrammarExample[] | undefined;
}

export interface GrammarTopic {
  id: GrammarTopicId;
  languageId: LanguageId;
  status: ContentStatus;
  /** Position inside its category; unique there for a language, gaps allowed. */
  order: number;
  category: GrammarCategory;
  /** The level where the topic is first needed, when it has one. */
  levelId?: LevelId | undefined;
  title: string;
  description: string;
  /** The language the title, texts and translations are written in. */
  instructionLanguage: LanguageId;
  sections: GrammarSection[];
}

/** A language's published topics, shelf by shelf, then by order. */
export function sortGrammarTopics<T extends Pick<GrammarTopic, "category" | "order" | "id">>(
  topics: readonly T[],
): T[] {
  const shelf = (category: GrammarCategory) => GRAMMAR_CATEGORIES.indexOf(category);
  return [...topics].sort(
    (a, b) =>
      shelf(a.category) - shelf(b.category) || a.order - b.order || a.id.localeCompare(b.id),
  );
}
