import { z } from "zod";

export const verifyEmailRequestSchema = z
  .object({
    token: z.string().min(1).max(512),
  })
  .strict();

export type VerifyEmailRequest = z.infer<typeof verifyEmailRequestSchema>;
