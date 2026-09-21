import type { ContentStatus } from "../content/content-status.js";
import type { LanguageId } from "../language/language-id.js";
import type { VocabularyCategoryId } from "./vocabulary-category-id.js";

/**
 * A topic that groups vocabulary entries ("greetings", "food"). A category is data owned by one
 * language — the same `id` may exist in several languages, each with its own set of entries — and
 * an entry belongs to exactly one category of its own language. Nothing in the application
 * branches on a category: it is a label, an order and a set of entries.
 */
export interface VocabularyCategory {
  id: VocabularyCategoryId;
  languageId: LanguageId;
  status: ContentStatus;
  /** Position among the language's categories; unique there, gaps allowed. */
  order: number;
  /** The language `title` and `description` are written in. */
  instructionLanguage: LanguageId;
  title: string;
  description?: string | undefined;
}
