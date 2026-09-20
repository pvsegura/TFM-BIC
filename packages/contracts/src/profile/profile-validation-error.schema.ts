import { z } from "zod";

/**
 * Per-field messages for the four editable profile fields. Not `.strict()`:
 * Zod's default "strip" drops any other key, so nothing but these four ever
 * reaches a client-visible field-error map.
 */
const profileFieldErrorsSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  nickname: z.string().optional(),
  avatarId: z.string().optional(),
});

/**
 * The 400 body of `PATCH /profile`: a generic `error` (same shape as every
 * other API error) plus, when they can be attributed to a field, safe
 * user-facing messages the form maps onto its inputs. Messages never echo the
 * rejected input.
 */
export const profileValidationErrorResponseSchema = z.object({
  error: z.string(),
  fields: profileFieldErrorsSchema.optional(),
});

export type ProfileValidationErrorResponse = z.infer<typeof profileValidationErrorResponseSchema>;
