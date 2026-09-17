import { isValidEmail } from "@tfm-bic/domain";
import { z } from "zod";

export const resendVerificationRequestSchema = z
  .object({
    email: z.string().trim().min(1).max(254).refine(isValidEmail, "Not a valid email address."),
  })
  .strict();

export type ResendVerificationRequest = z.infer<typeof resendVerificationRequestSchema>;
