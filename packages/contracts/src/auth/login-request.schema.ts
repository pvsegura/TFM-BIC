import { isValidEmail } from "@tfm-bic/domain";
import { z } from "zod";

/**
 * Deliberately not the full password policy (min length) — a login attempt
 * either matches a stored hash or it doesn't; rejecting a too-short
 * candidate here would just be a slightly different error path for the
 * same outcome. Only bounds length as a payload-size/DoS guard on the
 * hasher. Email format IS validated (unlike password policy) — this is a
 * pure input-shape check, identical for every address, so it carries no
 * account-enumeration risk (see ADR-006).
 */
export const loginRequestSchema = z
  .object({
    email: z.string().trim().min(1).max(254).refine(isValidEmail, "Not a valid email address."),
    password: z.string().min(1).max(128),
  })
  .strict();

export type LoginRequest = z.infer<typeof loginRequestSchema>;
