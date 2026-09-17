import { z } from "zod";

/** Shared shape for the generic, anti-enumeration-safe responses
 * (register, resend-verification, password-reset-request). */
export const messageResponseSchema = z.object({
  message: z.string(),
});

export type MessageResponse = z.infer<typeof messageResponseSchema>;
