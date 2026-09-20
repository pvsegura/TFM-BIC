import { ROLES } from "@tfm-bic/domain";
import { z } from "zod";

import { avatarIdSchema } from "./avatar-catalog.schema.js";

/**
 * What `GET`/`PATCH /profile` return: the student's profile fields plus their
 * read-only account facts (`email`, `role`), which come from the
 * authentication identity, not from the profile record. Deliberately not
 * `.strict()`: Zod's default "strip" mode removes any unexpected key, so this
 * doubles as a last-resort allowlist if a use case result ever carried
 * something it shouldn't (e.g. a password hash).
 */
export const profileResponseSchema = z.object({
  userId: z.string(),
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
  nickname: z.string().nullable(),
  avatarId: avatarIdSchema.nullable(),
  email: z.string(),
  role: z.enum(ROLES),
});

export type ProfileResponse = z.infer<typeof profileResponseSchema>;
