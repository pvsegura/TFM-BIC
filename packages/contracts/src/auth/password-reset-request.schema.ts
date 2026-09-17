import { z } from "zod";

export const passwordResetRequestSchema = z
  .object({
    email: z.string().trim().min(1).max(254),
  })
  .strict();

export type PasswordResetRequest = z.infer<typeof passwordResetRequestSchema>;
