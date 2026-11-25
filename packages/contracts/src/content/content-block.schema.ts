import { z } from "zod";

const CONTROL_CHARACTER = /\p{Cc}/u;
/** Anything shaped like an HTML tag, closing tag or comment. Content is plain
 * text; markup is never supported, so it is rejected at authoring time rather
 * than trusted to be escaped later (the UI escapes it anyway). */
const MARKUP = /<\/?[a-z!][^>]*>/i;

/**
 * A plain-text string: non-empty, bounded, no leading/trailing whitespace, no
 * control characters (so no line breaks — use another block instead) and no
 * markup. Unicode is otherwise unrestricted: the product is multilingual.
 */
export function plainText(maxLength: number) {
  return z
    .string()
    .min(1)
    .max(maxLength)
    .refine((value) => value === value.trim(), {
      error: "Must not start or end with whitespace.",
    })
    .refine((value) => !CONTROL_CHARACTER.test(value), {
      error: "Must not contain control characters or line breaks.",
    })
    .refine((value) => !MARKUP.test(value), { error: "Must be plain text, not markup." });
}

const explanationBlockSchema = z.strictObject({
  type: z.literal("explanation"),
  text: plainText(1000),
});

const exampleBlockSchema = z.strictObject({
  type: z.literal("example"),
  text: plainText(200),
  translation: plainText(200),
  note: plainText(300).optional(),
});

const dialogueLineSchema = z.strictObject({
  speaker: plainText(40),
  text: plainText(200),
  translation: plainText(200),
});

const dialogueBlockSchema = z.strictObject({
  type: z.literal("dialogue"),
  lines: z.array(dialogueLineSchema).min(1).max(40),
});

const paragraphs = z.array(plainText(1500)).min(1).max(12);

/** Keep in sync with UNIT_SECTION_PHASES in @verbysia/domain (a domain test checks it). */
export const UNIT_SECTION_PHASE_VALUES = [
  "perceive",
  "connect",
  "structure",
  "sound",
  "culture",
  "transform",
  "express",
  "review",
] as const;

const sectionBlockSchema = z.strictObject({
  type: z.literal("section"),
  phase: z.enum(UNIT_SECTION_PHASE_VALUES),
  title: plainText(120),
});

const readingBlockSchema = z.strictObject({
  type: z.literal("reading"),
  title: plainText(120),
  paragraphs,
});

const cultureBlockSchema = z.strictObject({
  type: z.literal("culture"),
  title: plainText(120),
  paragraphs,
});

const pitfallBlockSchema = z.strictObject({
  type: z.literal("pitfall"),
  wrong: plainText(200),
  right: plainText(200),
  explanation: plainText(600),
});

const comparisonBlockSchema = z.strictObject({
  type: z.literal("comparison"),
  source: plainText(200),
  target: plainText(200),
  note: plainText(300).optional(),
});

const tableBlockSchema = z
  .strictObject({
    type: z.literal("table"),
    caption: plainText(200).optional(),
    columns: z.array(plainText(60)).min(1).max(8),
    rows: z
      .array(z.array(plainText(120)).min(1).max(8))
      .min(1)
      .max(30),
  })
  .refine((table) => table.rows.every((row) => row.length === table.columns.length), {
    error: "Every row must have one cell per column.",
  });

const missionBlockSchema = z.strictObject({
  type: z.literal("mission"),
  title: plainText(120),
  steps: z.array(plainText(400)).min(1).max(10),
});

const summaryBlockSchema = z.strictObject({
  type: z.literal("summary"),
  phrases: z
    .array(z.strictObject({ text: plainText(200), translation: plainText(200) }))
    .min(1)
    .max(20),
  canDo: z.array(plainText(200)).min(1).max(10),
});

/** content/images/{asset}: lowercase slug + image extension; never a path. */
export const IMAGE_ASSET_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*\.(?:png|jpg|webp|svg)$/;

const imageBlockSchema = z.strictObject({
  type: z.literal("image"),
  asset: z.string().max(80).regex(IMAGE_ASSET_PATTERN),
  alt: plainText(300),
  caption: plainText(200).optional(),
});

/** The one definition of a content body block, shared by the on-disk format
 * and the API. A `type` not listed here is invalid — never rendered. */
export const contentBlockSchema = z.discriminatedUnion("type", [
  explanationBlockSchema,
  exampleBlockSchema,
  dialogueBlockSchema,
  sectionBlockSchema,
  readingBlockSchema,
  cultureBlockSchema,
  pitfallBlockSchema,
  comparisonBlockSchema,
  tableBlockSchema,
  missionBlockSchema,
  summaryBlockSchema,
  imageBlockSchema,
]);

/** A full unit (all PUENTE sections) fits; anything longer should be split into lessons. */
export const MAX_BLOCKS_PER_ITEM = 150;

/**
 * content/images/credits.json — where each illustration comes from (PLAN-LIBROS.md §11.2):
 * commissioned illustration, AI-generated, an icon bank or our own drawing, with its licence.
 */
export const imageCreditsSchema = z.record(
  z.string().regex(IMAGE_ASSET_PATTERN),
  z.strictObject({
    source: z.enum(["illustration", "ai", "icon-bank", "own"]),
    licence: plainText(200),
    author: plainText(200).optional(),
    tool: plainText(200).optional(),
    url: z.url().optional(),
  }),
);
