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

/** The one definition of a content body block, shared by the on-disk format
 * and the API. A `type` not listed here is invalid — never rendered. */
export const contentBlockSchema = z.discriminatedUnion("type", [
  explanationBlockSchema,
  exampleBlockSchema,
  dialogueBlockSchema,
]);

export const MAX_BLOCKS_PER_ITEM = 50;
