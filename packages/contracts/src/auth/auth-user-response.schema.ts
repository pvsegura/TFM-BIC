import { ROLES } from "@tfm-bic/domain";
import { z } from "zod";

/**
 * Mirrors `SafeUser` (packages/domain) exactly — deliberately not `.strict()`:
 * unknown keys (there should never be any, e.g. a password hash) are
 * stripped by Zod's default "strip" mode rather than causing a parse
 * failure, so this also acts as a last-resort filter if an extra field
 * ever leaked into a use case's result.
 */
export const authUserResponseSchema = z.object({
  id: z.string(),
  email: z.string(),
  role: z.enum(ROLES),
  emailVerified: z.boolean(),
});

export type AuthUserResponse = z.infer<typeof authUserResponseSchema>;
