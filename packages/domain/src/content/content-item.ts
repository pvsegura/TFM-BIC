import type { LanguageId } from "../language/language-id.js";
import type { LevelId } from "../language/level-id.js";
import type { ContentId } from "./content-id.js";
import type { ContentStatus } from "./content-status.js";
import type { ContentType } from "./content-type.js";

/**
 * Body building blocks. Structured data, never markup: every string is plain
 * text, and the UI maps each known `type` to a safe component. A block type
 * the UI does not know is not rendered.
 */
export interface ExplanationBlock {
  type: "explanation";
  /** Plain-text explanation, written in the item's `instructionLanguage`. */
  text: string;
}

export interface ExampleBlock {
  type: "example";
  /** A phrase or sentence in the language being learned. */
  text: string;
  /** Its meaning, in the item's `instructionLanguage`. */
  translation: string;
  /** Optional plain-text hint (register, pronunciation, usage). */
  note?: string | undefined;
}

export interface DialogueLine {
  speaker: string;
  text: string;
  translation: string;
}

export interface DialogueBlock {
  type: "dialogue";
  lines: DialogueLine[];
}

export type ContentBlock = ExplanationBlock | ExampleBlock | DialogueBlock;
export type ContentBlockType = ContentBlock["type"];

/**
 * One piece of learning content, addressed by language and level. Content is
 * data: the same shape holds Polish A1 today and any other language or level
 * tomorrow, and no code branches on which language it is.
 *
 * `instructionLanguage` is the language the explanations and translations are
 * written in. It is deliberately separate from `languageId` (the language being
 * learned), so learning language and interface language stay distinct concepts.
 */
export interface ContentItem {
  id: ContentId;
  languageId: LanguageId;
  levelId: LevelId;
  type: ContentType;
  status: ContentStatus;
  /** Position within its language and level; unique there, gaps allowed. */
  order: number;
  instructionLanguage: LanguageId;
  title: string;
  /** One-sentence summary shown in lists. */
  description: string;
  blocks: ContentBlock[];
}
