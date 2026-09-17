import { MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH } from "@tfm-bic/domain";
import { z } from "zod";

export const passwordResetConfirmSchema = z
  .object({
    token: z.string().min(1).max(512),
    newPassword: z
      .string()
      .min(MIN_PASSWORD_LENGTH, `Password must be at least ${MIN_PASSWORD_LENGTH} characters long.`)
      .max(MAX_PASSWORD_LENGTH),
  })
  .strict();

export type PasswordResetConfirm = z.infer<typeof passwordResetConfirmSchema>;
