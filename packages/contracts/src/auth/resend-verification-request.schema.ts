import { z } from "zod";

export const resendVerificationRequestSchema = z
  .object({
    email: z.string().trim().min(1).max(254),
  })
  .strict();

export type ResendVerificationRequest = z.infer<typeof resendVerificationRequestSchema>;
