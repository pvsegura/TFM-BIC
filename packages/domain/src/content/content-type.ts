/**
 * What kind of learning unit a content item is. Only the minimum M5 needs:
 * - `lesson`: a unit of teaching made of content blocks. M5 only stores and
 *   shows its structure; the lesson experience (M6: list, viewer, completion; exercises are later)
 *   is M6.
 * - `explanation`: a standalone reference note (for example how a spelling
 *   rule works) that is not part of a lesson sequence.
 *
 * Adding a type (vocabulary set, exercise set, ...) is a change here plus the
 * file schema — never a per-language code path.
 */
export const CONTENT_TYPES = ["lesson", "explanation"] as const;
export type ContentType = (typeof CONTENT_TYPES)[number];

export function isValidContentType(value: string): value is ContentType {
  return CONTENT_TYPES.some((type) => type === value);
}
