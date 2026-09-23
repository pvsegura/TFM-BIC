import type { ContentStatus } from "../content/content-status.js";
import type { LanguageId } from "../language/language-id.js";
import type { PhoneticTopicId } from "./phonetic-topic-id.js";

/**
 * One grouping of phonetic representations (`consonants`, `vowels`, `stress-rules`, ...), read
 * from `content/languages/<languageId>/phonetics/<topicId>.json` — the same file-per-topic shape
 * `VocabularyCategory` uses (ADR-022). A topic's own representations are the file's `items`; the
 * topic itself carries only what describes the group.
 */
export interface PhoneticTopic {
  id: PhoneticTopicId;
  languageId: LanguageId;
  status: ContentStatus;
  /** Position among a language's topics; unique there, gaps allowed. */
  order: number;
  title: string;
  description?: string | undefined;
  /** The language `title` and `description` are written in. */
  instructionLanguage: LanguageId;
}
