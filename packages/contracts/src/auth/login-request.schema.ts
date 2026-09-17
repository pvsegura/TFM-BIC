import { z } from "zod";

/**
 * Deliberately not the full password policy (min length) — a login attempt
 * either matches a stored hash or it doesn't; rejecting a too-short
 * candidate here would just be a slightly different error path for the
 * same outcome. Only bounds length as a payload-size/DoS guard on the
 * hasher.
 */
export const loginRequestSchema = z
  .object({
    email: z.string().trim().min(1).max(254),
    password: z.string().min(1).max(128),
  })
  .strict();

export type LoginRequest = z.infer<typeof loginRequestSchema>;
