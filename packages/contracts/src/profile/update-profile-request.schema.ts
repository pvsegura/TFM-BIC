import {
  isValidNickname,
  isValidProfileName,
  MAX_NICKNAME_LENGTH,
  MAX_PROFILE_NAME_LENGTH,
  MIN_NICKNAME_LENGTH,
} from "@tfm-bic/domain";
import { z } from "zod";

import { avatarIdSchema } from "./avatar-catalog.schema.js";

const NAME_MESSAGE = `Enter 1–${MAX_PROFILE_NAME_LENGTH} characters, without line breaks or control characters.`;
const NICKNAME_MESSAGE = `Enter ${MIN_NICKNAME_LENGTH}–${MAX_NICKNAME_LENGTH} characters, without line breaks or control characters.`;

/**
 * Text fields are trimmed, then must be a valid value; `null` explicitly
 * clears the field and an omitted key leaves it unchanged. An empty or
 * whitespace-only string is a validation error — it is never stored and never
 * silently turned into `null`.
 */
const nameField = z
  .string()
  .trim()
  .min(1, NAME_MESSAGE)
  .max(MAX_PROFILE_NAME_LENGTH, NAME_MESSAGE)
  .refine(isValidProfileName, NAME_MESSAGE)
  .nullable()
  .optional();

const nicknameField = z
  .string()
  .trim()
  .min(MIN_NICKNAME_LENGTH, NICKNAME_MESSAGE)
  .max(MAX_NICKNAME_LENGTH, NICKNAME_MESSAGE)
  .refine(isValidNickname, NICKNAME_MESSAGE)
  .nullable()
  .optional();

/**
 * `.strict()`: any key other than the four below — `role`, `userId`, `email`,
 * `emailVerified`, anything — fails validation outright (a visible 400, not a
 * silent drop), which is the mass-assignment defense for this endpoint. The
 * use case independently accepts only these fields plus a session-derived
 * `userId`, so this is defense in depth, not the only guard. Identity always
 * comes from the authenticated session, never from this body.
 */
export const updateProfileRequestSchema = z
  .object({
    firstName: nameField,
    lastName: nameField,
    nickname: nicknameField,
    avatarId: avatarIdSchema.optional(),
  })
  .strict();

export type UpdateProfileRequest = z.infer<typeof updateProfileRequestSchema>;
