import { z } from "zod";

/**
 * Environment variables read across apps/api. See .env.example and
 * docs/deployment/environments.md for the authoritative list/grouping.
 */
const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "staging", "production"]).default("development"),
    PORT: z.coerce.number().int().positive().default(3000),
    DEFAULT_LANGUAGE: z.string().default("pl"),
    // Languages & Content (M5, ADR-018): where the content tree lives. Unset = the repository's own
    // `content/` folder (resolved by packages/data); a deployment that ships content elsewhere sets it.
    CONTENT_DIR: z.string().min(1).optional(),
    // Database (M3, ADR-005) — required everywhere except NODE_ENV=test,
    // which uses an in-process PGlite instance instead (see packages/data).
    DATABASE_URL: z.string().min(1).optional(),
    // Auth (M3, ADR-006) — required only in staging/production; missing in
    // development/test falls back to an ephemeral per-process secret
    // (apps/api's composition root), since dev/test sessions don't need to
    // survive a restart.
    AUTH_SESSION_SECRET: z.string().min(1).optional(),
    APP_BASE_URL: z.string().min(1).default("http://localhost:5173"),
    // Set only by tests/e2e/playwright.config.ts, never by a developer or
    // CI env file — raises auth rate-limit ceilings so a full E2E run
    // (many registrations/logins against one shared server) doesn't trip
    // them. Deliberately NOT the same signal as NODE_ENV=test: the Vitest
    // unit test for rate limiting (apps/api/src/routes/auth.route.test.ts)
    // also runs under NODE_ENV=test and must keep proving the real,
    // strict limits work — see docs/adr/adr-006-authentication.md.
    E2E_RELAXED_RATE_LIMITS: z
      .enum(["true", "false"])
      .default("false")
      .transform((value) => value === "true"),
    // Video generation (M11, ADR-011/012). "fake" (the default) is a real, committed adapter —
    // never Hyperframes — used everywhere except a manually configured real-provider run;
    // automated tests and CI never set this to "hyperframes". Local self-hosted Hyperframes
    // rendering needs no credential, so there is no accompanying API-key variable.
    VIDEO_GENERATION_PROVIDER: z.enum(["fake", "hyperframes"]).default("fake"),
  })
  .check((ctx) => {
    const { NODE_ENV, DATABASE_URL, AUTH_SESSION_SECRET } = ctx.value;

    if (NODE_ENV !== "test" && !DATABASE_URL) {
      ctx.issues.push({
        code: "custom",
        input: ctx.value,
        path: ["DATABASE_URL"],
        message: `DATABASE_URL is required when NODE_ENV is not "test" (see docs/adr/adr-005-database.md).`,
      });
    }

    if ((NODE_ENV === "production" || NODE_ENV === "staging") && !AUTH_SESSION_SECRET) {
      ctx.issues.push({
        code: "custom",
        input: ctx.value,
        path: ["AUTH_SESSION_SECRET"],
        message: `AUTH_SESSION_SECRET is required when NODE_ENV is "production" or "staging" (see docs/adr/adr-006-authentication.md).`,
      });
    }
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
