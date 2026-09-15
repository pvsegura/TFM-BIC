import { z } from "zod";

/**
 * Shared shape for GET /health, consumed by apps/api (to validate/shape its
 * response) and available to apps/web (to type a future health check) —
 * proves contracts can be shared between frontend and backend without
 * either depending on the other. See docs/architecture/api contracts note.
 */
export const healthResponseSchema = z.object({
  status: z.literal("ok"),
  timestamp: z.iso.datetime(),
  defaultLanguage: z.string(),
});

export type HealthResponse = z.infer<typeof healthResponseSchema>;
