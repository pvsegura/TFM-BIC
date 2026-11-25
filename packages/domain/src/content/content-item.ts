import type { ContentAccessLevel } from "./content-access.js";
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

/**
 * The PUENTE phases a unit is divided into (docs/product/verbysia/METODO-PUENTE.md), plus the
 * sound/register, reading/culture and review sections the books share with the web.
 */
export const UNIT_SECTION_PHASES = [
  "perceive",
  "connect",
  "structure",
  "sound",
  "culture",
  "transform",
  "express",
  "review",
] as const;
export type UnitSectionPhase = (typeof UNIT_SECTION_PHASES)[number];

/** Starts a section of a unit; every block after it belongs to that section. */
export interface SectionBlock {
  type: "section";
  phase: UnitSectionPhase;
  title: string;
}

/** A reading text in the language being learned. */
export interface ReadingBlock {
  type: "reading";
  title: string;
  paragraphs: string[];
}

/** Culture notes, written in the instruction language. */
export interface CultureBlock {
  type: "culture";
  title: string;
  paragraphs: string[];
}

/** A typical learner error: the wrong form, the right one, and why. */
export interface PitfallBlock {
  type: "pitfall";
  wrong: string;
  right: string;
  /** In the instruction language. */
  explanation: string;
}

/** How something is said in the instruction language next to the language being learned. */
export interface ComparisonBlock {
  type: "comparison";
  /** In the instruction language. */
  source: string;
  /** In the language being learned. */
  target: string;
  note?: string | undefined;
}

/** A small table (conjugations, forms). Cells are plain text. */
export interface TableBlock {
  type: "table";
  caption?: string | undefined;
  columns: string[];
  rows: string[][];
}

/** A communicative task for the learner to carry out (speaking or writing). */
export interface MissionBlock {
  type: "mission";
  title: string;
  steps: string[];
}

/** End-of-unit summary: key phrases and "I can…" statements for self-assessment. */
export interface SummaryBlock {
  type: "summary";
  phrases: { text: string; translation: string }[];
  canDo: string[];
}

/**
 * An illustration from content/images (file name with extension). Its source and licence are in
 * content/images/credits.json — the content validator refuses an image without credits.
 */
export interface ImageBlock {
  type: "image";
  asset: string;
  /** Describes the image for screen readers, in the instruction language. */
  alt: string;
  caption?: string | undefined;
}

export type ContentBlock =
  | ImageBlock
  | ExplanationBlock
  | ExampleBlock
  | DialogueBlock
  | SectionBlock
  | ReadingBlock
  | CultureBlock
  | PitfallBlock
  | ComparisonBlock
  | TableBlock
  | MissionBlock
  | SummaryBlock;
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
  /** Absent means `course`: a licence for this level is required (see commerce/entitlement.ts). */
  access?: ContentAccessLevel | undefined;
  /** The course unit it belongs to (0 = the starter challenge); shared with the books and short links. */
  unit?: number | undefined;
  title: string;
  /** One-sentence summary shown in lists. */
  description: string;
  blocks: ContentBlock[];
}
