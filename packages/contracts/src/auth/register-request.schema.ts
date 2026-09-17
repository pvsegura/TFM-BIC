import { isValidEmail, MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH } from "@tfm-bic/domain";
import { z } from "zod";

/**
 * `.strict()`: an unexpected field (e.g. a client-supplied `role`) fails
 * validation outright rather than being silently dropped — a visible
 * 400, not a quiet no-op, for a self-assigned-privileged-role attempt (see
 * docs/adr/adr-006-authentication.md). The use case itself also never
 * reads a role from its input, so this is defense in depth, not the only
 * guard.
 */
export const registerRequestSchema = z
  .object({
    email: z.string().trim().min(1).max(254).refine(isValidEmail, "Not a valid email address."),
    password: z
      .string()
      .min(MIN_PASSWORD_LENGTH, `Password must be at least ${MIN_PASSWORD_LENGTH} characters long.`)
      .max(MAX_PASSWORD_LENGTH),
  })
  .strict();

export type RegisterRequest = z.infer<typeof registerRequestSchema>;
