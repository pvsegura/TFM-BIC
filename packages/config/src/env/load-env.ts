import { z } from "zod";

/**
 * Only the environment variables apps/api actually reads in M1. The rest of
 * .env.example (DATABASE_URL, AUTH_SECRET, EMAIL_PROVIDER_API_KEY,
 * GEMINI_API_KEY, HYPERFRAMES_CONFIG) stay undeclared here on purpose —
 * making them required would break plain local/frontend development before
 * those integrations exist (see docs/deployment/environments.md). Extend
 * this schema when the feature that needs a given variable is implemented.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "staging", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  DEFAULT_LANGUAGE: z.string().default("pl"),
});

export type AppEnv = z.infer<typeof envSchema>;

/**
 * Validates process environment variables at startup — fails fast with a
 * readable error instead of letting the app boot with malformed config.
 */
export function loadEnv(source: NodeJS.ProcessEnv = process.env): AppEnv {
  const parsed = envSchema.safeParse(source);

  if (!parsed.success) {
    throw new Error(`Invalid environment configuration:\n${z.prettifyError(parsed.error)}`);
  }

  return parsed.data;
}
