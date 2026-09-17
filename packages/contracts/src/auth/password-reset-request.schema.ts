import { isValidEmail } from "@tfm-bic/domain";
import { z } from "zod";

export const passwordResetRequestSchema = z
  .object({
    email: z.string().trim().min(1).max(254).refine(isValidEmail, "Not a valid email address."),
  })
  .strict();

export type PasswordResetRequest = z.infer<typeof passwordResetRequestSchema>;
