import { isIP } from "node:net";

import { z } from "zod";

/** Where the SPA runs in development/test when APP_BASE_URL is unset. Never used in staging or
 * production, which must name their own https origin (M16). */
const DEVELOPMENT_APP_BASE_URL = "http://localhost:5173";

/** HMAC keys shorter than this are refused in staging/production (M16) — 32 characters is the
 * same floor EMAIL_LINK_SECRET has had since M14. */
const MIN_PRODUCTION_SECRET_LENGTH = 32;

function isHttpUrl(value: string, protocols: readonly string[]): boolean {
  try {
    return protocols.includes(new URL(value).protocol);
  } catch {
    return false;
  }
}

/** Host names that only ever mean "this machine" — never a valid public or database host in a
 * deployed environment (M17). URL.hostname keeps the brackets of an IPv6 literal. */
function isLoopbackOrUnspecifiedHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.startsWith("127.") ||
    host === "0.0.0.0" ||
    host === "[::1]" ||
    host === "[::]"
  );
}

function hostnameOf(value: string): string | undefined {
  try {
    return new URL(value).hostname;
  } catch {
    return undefined;
  }
}

/** libpq/`pg` modes that encrypt the connection (M17: required for the production database). */
const TLS_SSL_MODES = ["require", "verify-ca", "verify-full"];

/** The parsed DATABASE_URL, when it is a Postgres URL at all. */
function parsePostgresUrl(value: string): URL | undefined {
  try {
    const url = new URL(value);
    return url.protocol === "postgres:" || url.protocol === "postgresql:" ? url : undefined;
  } catch {
    return undefined;
  }
}

/** One IPv4/IPv6 address, optionally with a CIDR prefix of a valid length for its family. */
function isAddressOrCidr(entry: string): boolean {
  const [address = "", prefix, ...rest] = entry.split("/");
  const family = isIP(address);
  if (family === 0 || rest.length > 0) {
    return false;
  }
  if (prefix === undefined) {
    return true;
  }
  const bits = Number(prefix);
  return /^\d{1,3}$/.test(prefix) && bits <= (family === 4 ? 32 : 128);
}

/**
 * TRUST_PROXY (M16): the proxies whose X-Forwarded-For Fastify may believe, as a comma-separated
 * list of IP addresses/CIDR ranges. Empty = trust none (request.ip is the socket peer). "true",
 * hop counts and host names are refused: they would let any client spoof its address and bypass
 * every per-IP rate limit (Fastify 5.12 itself disables hop-count trust for that reason).
 */
const trustProxySchema = z
  .string()
  .optional()
  .transform((value, ctx) => {
    if (value === undefined || value.trim() === "") {
      return [];
    }
    const entries = value.split(",").map((entry) => entry.trim());
    if (!entries.every(isAddressOrCidr)) {
      ctx.issues.push({
        code: "custom",
        input: value,
        message:
          "must be a comma-separated list of proxy IP addresses or CIDR ranges (never true, a hop count or a host name)",
      });
      return z.NEVER;
    }
    return entries;
  });

/** A non-empty value on one line — for values that end up in email headers. */
function singleLine(maxLength: number) {
  return z
    .string()
    .min(1)
    .max(maxLength)
    .refine((value) => !/[\r\n]/.test(value), { message: "must not contain line breaks" });
}

/**
 * Environment variables read across apps/api. See .env.example and
 * docs/deployment/environments.md for the authoritative list/grouping.
 */
/** The default sender: fine for the fake provider, rejected by a real one. */
const PLACEHOLDER_EMAIL_FROM = "TFM-BIC <no-reply@example.invalid>";

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
    // Origin of the SPA: email links and the Origin check are built from it. Defaults to the Vite dev
    // server outside staging/production; staging/production must set an https URL (M16).
    APP_BASE_URL: z
      .string()
      .refine((value) => isHttpUrl(value, ["http:", "https:"]), {
        message: "must be an http(s) URL",
      })
      .optional(),
    // Reverse proxies allowed to set X-Forwarded-For (M16) — see trustProxySchema above.
    TRUST_PROXY: trustProxySchema,
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
    // "disabled" (M17): the feature is switched off — requests are refused with 503 and no
    // provider is called. The only setting production accepts until Hyperframes is verified.
    VIDEO_GENERATION_PROVIDER: z.enum(["fake", "hyperframes", "disabled"]).default("fake"),
    // Audio generation (M12, ADR-013). "fake" (the default) is a real, committed adapter that
    // returns a short tone — never Gemini — and is what development, tests and CI use. "gemini"
    // needs GEMINI_API_KEY and is refused under NODE_ENV=test, so no automated run can ever call a
    // paid provider. GEMINI_TTS_MODEL is read only by the Gemini adapter's composition; the default
    // is the GA TTS model verified on 2026-09-25.
    // "disabled" (M17): as for video — requests get 503, Gemini is never called.
    AUDIO_GENERATION_PROVIDER: z.enum(["fake", "gemini", "disabled"]).default("fake"),
    GEMINI_API_KEY: z.string().min(1).optional(),
    GEMINI_TTS_MODEL: z.string().min(1).default("gemini-3.8-flash-tts"),
    // Characters per clip. Capped at the domain's SPEECH_TEXT_MAX_LENGTH (500), which this package
    // cannot import (it depends on nothing internal) — keep the two in step.
    AUDIO_GENERATION_MAX_TEXT_LENGTH: z.coerce.number().int().min(1).max(500).default(300),
    // AI Learning Coach (M23, ADR-034). "fake" (the default) is a real, committed adapter that
    // calls nothing and is what development, tests and CI use. "gemini" needs an API key and is
    // refused under NODE_ENV=test, so no automated run can ever reach the paid API. "disabled"
    // refuses every coaching request with a safe 503 and calls nothing — the setting to use until
    // the provider-terms question of ADR-013 (the under-18 clause) is decided.
    AI_COACH_PROVIDER: z.enum(["fake", "gemini", "disabled"]).default("fake"),
    // The GA model with function calling, verified 2026-10-06. Read only by the coach's
    // composition root, like GEMINI_TTS_MODEL.
    AI_COACH_MODEL: z.string().min(1).default("gemini-3.8-flash"),
    // Optional: a key for the coach alone. Without it the coach and the offline media pipeline
    // share one Gemini project's daily quota, so learner traffic competes with video generation.
    // Falls back to GEMINI_API_KEY when unset.
    GEMINI_AGENT_API_KEY: z.string().min(1).optional(),
    // How long a whole coaching turn may take before the learner is told it took too long — the
    // budget for the turn, not for one provider call (a turn makes one call plus one per tool
    // round). Measured 2026-10-07: a free-tier key often needs far longer than a paid one for the
    // same request, so a deployment on the free tier needs a generous value here and a paid one
    // does not. Bounded at 3 minutes: past that a learner has given up anyway.
    AI_COACH_TURN_TIMEOUT_MS: z.coerce.number().int().min(5_000).max(180_000).default(120_000),
    // Email (M14, ADR-014/ADR-025). "fake" (the default) keeps messages in memory and sends
    // nothing — local development, tests and CI. "resend" sends through Resend (needs
    // RESEND_API_KEY and a real EMAIL_FROM on a domain verified in Resend); it is refused under
    // NODE_ENV=test, so no automated run can ever email a real person.
    EMAIL_PROVIDER: z.enum(["fake", "resend"]).default("fake"),
    // Secret — set only in the host's secret store, never in a committed file.
    RESEND_API_KEY: z.string().min(1).optional(),
    // Sender and optional reply-to shown on every email. No line breaks (header injection).
    EMAIL_FROM: singleLine(320).default(PLACEHOLDER_EMAIL_FROM),
    EMAIL_REPLY_TO: singleLine(320).optional(),
    // Signs newsletter unsubscribe links (HMAC). Required in production/staging; development and
    // test fall back to an ephemeral per-process secret, like AUTH_SESSION_SECRET. Rotating it
    // invalidates the unsubscribe links in already-sent newsletters — rotate only deliberately.
    EMAIL_LINK_SECRET: z.string().min(32).optional(),
    // Production readiness (M17). The built SPA (apps/web/dist) the API serves from its own
    // origin; required in staging/production, unset in development/test where Vite serves it.
    WEB_DIST_DIR: z.string().min(1).optional(),
    // Immutable build identifier shown by GET /health (the image sets it from the Git SHA).
    // Restricted to a plain token: it is public, and must never carry anything but a version.
    APP_VERSION: z
      .string()
      .regex(/^[A-Za-z0-9][A-Za-z0-9._+-]{0,63}$/, {
        message: "must be 1–64 letters, digits, '.', '_', '+' or '-'",
      })
      .default("development"),
    // Observability (M18, ADR-029). Minimum level written to the log; NODE_ENV=test is always
    // silent. Production refuses `debug` (volume, and more request detail than operations needs).
    LOG_LEVEL: z.enum(["error", "warn", "info", "debug"]).default("info"),
    // Bearer token for GET /internal/metrics. Unset = the endpoint does not exist. Secret.
    METRICS_TOKEN: z.string().min(32).optional(),
  })
  .check((ctx) => {
    const { NODE_ENV, DATABASE_URL, AUTH_SESSION_SECRET, EMAIL_LINK_SECRET, APP_BASE_URL } =
      ctx.value;
    const isDeployed = NODE_ENV === "production" || NODE_ENV === "staging";
    const issue = (path: string, message: string) =>
      ctx.issues.push({ code: "custom", input: ctx.value, path: [path], message });

    // M17: nothing in a deployed environment may point at "this machine".
    if (isDeployed && APP_BASE_URL !== undefined) {
      const host = hostnameOf(APP_BASE_URL);
      if (host !== undefined && isLoopbackOrUnspecifiedHost(host)) {
        issue(
          "APP_BASE_URL",
          `APP_BASE_URL must be the public origin, not a loopback/unspecified address, when NODE_ENV is "production" or "staging".`,
        );
      }
    }

    if (DATABASE_URL !== undefined && NODE_ENV !== "test") {
      const url = parsePostgresUrl(DATABASE_URL);
      // Messages never contain the URL: it carries the database password.
      if (!url) {
        issue("DATABASE_URL", "DATABASE_URL must be a postgres:// or postgresql:// URL.");
      } else if (NODE_ENV === "production") {
        if (isLoopbackOrUnspecifiedHost(url.hostname)) {
          issue(
            "DATABASE_URL",
            `DATABASE_URL must not point at a loopback/unspecified host when NODE_ENV is "production".`,
          );
        }
        if (!TLS_SSL_MODES.includes(url.searchParams.get("sslmode") ?? "")) {
          issue(
            "DATABASE_URL",
            `DATABASE_URL must set sslmode=require, verify-ca or verify-full when NODE_ENV is "production" (see docs/production/M17-DEPLOYMENT-ARCHITECTURE.md).`,
          );
        }
      }
    }

    if (isDeployed && !ctx.value.WEB_DIST_DIR) {
      issue(
        "WEB_DIST_DIR",
        `WEB_DIST_DIR is required when NODE_ENV is "production" or "staging": the API serves the SPA from the same origin (ADR-028).`,
      );
    }

    if (ctx.value.EMAIL_PROVIDER === "resend") {
      if (NODE_ENV === "test") {
        issue(
          "EMAIL_PROVIDER",
          `EMAIL_PROVIDER=resend is not allowed when NODE_ENV is "test" — automated tests never send real email.`,
        );
      }
      if (!ctx.value.RESEND_API_KEY) {
        issue("RESEND_API_KEY", `RESEND_API_KEY is required when EMAIL_PROVIDER is "resend".`);
      }
      if (ctx.value.EMAIL_FROM === PLACEHOLDER_EMAIL_FROM) {
        issue(
          "EMAIL_FROM",
          `EMAIL_FROM must be set to an address on a domain verified in Resend when EMAIL_PROVIDER is "resend".`,
        );
      }
    }

    // M17: production never runs a fake provider.
    if (NODE_ENV === "production") {
      if (ctx.value.EMAIL_PROVIDER === "fake") {
        issue(
          "EMAIL_PROVIDER",
          `EMAIL_PROVIDER=fake is not allowed when NODE_ENV is "production" — it sends nothing; use "resend".`,
        );
      }
      if (ctx.value.AUDIO_GENERATION_PROVIDER === "fake") {
        issue(
          "AUDIO_GENERATION_PROVIDER",
          `AUDIO_GENERATION_PROVIDER must be "gemini" or "disabled" when NODE_ENV is "production" (never "fake").`,
        );
      }
      if (ctx.value.VIDEO_GENERATION_PROVIDER !== "disabled") {
        issue(
          "VIDEO_GENERATION_PROVIDER",
          `VIDEO_GENERATION_PROVIDER must be "disabled" when NODE_ENV is "production": "fake" is not real and "hyperframes" is unverified with no persistent media storage (ADR-012, ADR-028).`,
        );
      }
      if (ctx.value.LOG_LEVEL === "debug") {
        issue(
          "LOG_LEVEL",
          `LOG_LEVEL=debug is not allowed when NODE_ENV is "production" (use staging to debug, ADR-029).`,
        );
      }
      // M23: as for audio — production serves learners, so it never runs the offline coach that
      // calls nothing while telling learners it is an AI.
      if (ctx.value.AI_COACH_PROVIDER === "fake") {
        issue(
          "AI_COACH_PROVIDER",
          `AI_COACH_PROVIDER must be "gemini" or "disabled" when NODE_ENV is "production" (never "fake", which answers without calling any provider — ADR-034).`,
        );
      }
    }

    if (
      isDeployed &&
      AUTH_SESSION_SECRET &&
      AUTH_SESSION_SECRET.length < MIN_PRODUCTION_SECRET_LENGTH
    ) {
      ctx.issues.push({
        code: "custom",
        input: ctx.value,
        path: ["AUTH_SESSION_SECRET"],
        message: `AUTH_SESSION_SECRET must be at least ${String(MIN_PRODUCTION_SECRET_LENGTH)} characters when NODE_ENV is "production" or "staging" (see docs/security/M16-SECURITY-AUDIT.md, S-09).`,
      });
    }

    if (isDeployed && (APP_BASE_URL === undefined || !isHttpUrl(APP_BASE_URL, ["https:"]))) {
      ctx.issues.push({
        code: "custom",
        input: ctx.value,
        path: ["APP_BASE_URL"],
        message: `APP_BASE_URL must be set to an https URL when NODE_ENV is "production" or "staging" (email links and the Origin check use it).`,
      });
    }

    if (ctx.value.E2E_RELAXED_RATE_LIMITS && NODE_ENV !== "test") {
      ctx.issues.push({
        code: "custom",
        input: ctx.value,
        path: ["E2E_RELAXED_RATE_LIMITS"],
        message: `E2E_RELAXED_RATE_LIMITS=true is only allowed when NODE_ENV is "test" (it multiplies every rate limit by 100).`,
      });
    }

    if ((NODE_ENV === "production" || NODE_ENV === "staging") && !EMAIL_LINK_SECRET) {
      ctx.issues.push({
        code: "custom",
        input: ctx.value,
        path: ["EMAIL_LINK_SECRET"],
        message: `EMAIL_LINK_SECRET (at least 32 characters) is required when NODE_ENV is "production" or "staging" (see docs/adr/adr-025-email-newsletter.md).`,
      });
    }

    if (ctx.value.AUDIO_GENERATION_PROVIDER === "gemini") {
      if (NODE_ENV === "test") {
        ctx.issues.push({
          code: "custom",
          input: ctx.value,
          path: ["AUDIO_GENERATION_PROVIDER"],
          message: `AUDIO_GENERATION_PROVIDER=gemini is not allowed when NODE_ENV is "test" (see docs/adr/adr-013-audio-generation.md).`,
        });
      }
      if (!ctx.value.GEMINI_API_KEY) {
        ctx.issues.push({
          code: "custom",
          input: ctx.value,
          path: ["GEMINI_API_KEY"],
          message: `GEMINI_API_KEY is required when AUDIO_GENERATION_PROVIDER is "gemini" (see docs/adr/adr-013-audio-generation.md).`,
        });
      }
    }

    // M23 (ADR-034): the same two guards as audio, for the coach. The key may be the coach's own
    // (GEMINI_AGENT_API_KEY, which keeps learner traffic off the media pipeline's daily quota) or
    // the shared one.
    if (ctx.value.AI_COACH_PROVIDER === "gemini") {
      if (NODE_ENV === "test") {
        ctx.issues.push({
          code: "custom",
          input: ctx.value,
          path: ["AI_COACH_PROVIDER"],
          message: `AI_COACH_PROVIDER=gemini is not allowed when NODE_ENV is "test" (see docs/adr/adr-034-ai-learning-agent.md).`,
        });
      }
      if (!ctx.value.GEMINI_AGENT_API_KEY && !ctx.value.GEMINI_API_KEY) {
        ctx.issues.push({
          code: "custom",
          input: ctx.value,
          path: ["GEMINI_AGENT_API_KEY"],
          message: `GEMINI_AGENT_API_KEY (or GEMINI_API_KEY) is required when AI_COACH_PROVIDER is "gemini" (see docs/adr/adr-034-ai-learning-agent.md).`,
        });
      }
    }

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
  })
  .transform((env) => ({ ...env, APP_BASE_URL: env.APP_BASE_URL ?? DEVELOPMENT_APP_BASE_URL }));

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
