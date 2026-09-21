import { z } from "zod";

/**
 * A digits-only string such as "20": `Number("1e2")` and `Number("0x10")` are numbers, so a plain
 * coercion of a query parameter would accept them. Shared by every paged endpoint, so the rule
 * for what a page size or a numeric cursor may look like is written once.
 */
export const wholeNumberText = z
  .string()
  .regex(/^[1-9]\d{0,8}$/, { error: "Expected a whole number." });
