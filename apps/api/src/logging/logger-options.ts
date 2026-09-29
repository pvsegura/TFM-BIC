import type { AppEnv } from "@tfm-bic/config";

import { redactParams, serializeError } from "./error-serializer.js";
import { serializeRequest } from "./request-serializer.js";

type LogArgs = unknown[];
type LogMethod = (...args: LogArgs) => void;

/**
 * Pino builds a line's `msg` from the arguments *before* serializers run: a message string, or —
 * when an `Error` is logged on its own — the error's message. Both can be a failed query with its
 * bound parameters (Fastify's default error handler logs `err.message`; index.ts logs a start-up
 * error directly). This hook redacts them the same way the error serializer does.
 */
function redactLogArguments(this: unknown, args: LogArgs, method: LogMethod): void {
  const [first, ...rest] = args;
  if (first instanceof Error && rest.length === 0) {
    method.call(this, { err: first }, redactParams(first.message));
    return;
  }
  method.apply(
    this,
    args.map((arg) => (typeof arg === "string" ? redactParams(arg) : arg)),
  );
}

/** Field names that must never reach a log line, at the top level or one object down (M18). */
const SECRET_FIELDS = [
  "password",
  "currentPassword",
  "newPassword",
  "token",
  "apiKey",
  "secret",
  "authorization",
  "cookie",
];

const REDACT_PATHS = [
  "req.headers.authorization",
  "req.headers.cookie",
  "res.headers['set-cookie']",
  ...SECRET_FIELDS.flatMap((field) => [field, `*.${field}`]),
];

export const LOG_SERVICE_NAME = "tfm-bic-api";

/**
 * The API's logger configuration. Never log secrets or unnecessary personal data — see
 * docs/observability-data-policy.md, docs/security/security-baseline.md and
 * docs/privacy/DATA-CLASSIFICATION.md.
 *
 * - Every line carries `service`, `env` and `version` (M18), an ISO `time` and a level label.
 * - Cookies, the authorization header, `set-cookie` and secret-named fields are redacted.
 * - Request logs carry no query string (M14: one-click unsubscribe links carry a token there).
 * - Errors are serialized from an allowlist, and log messages are scrubbed, so bound SQL
 *   parameters and driver `detail` never reach a log line (M15).
 */
export function createLoggerOptions(env: Pick<AppEnv, "NODE_ENV" | "LOG_LEVEL" | "APP_VERSION">) {
  return {
    level: env.NODE_ENV === "test" ? "silent" : env.LOG_LEVEL,
    base: { service: LOG_SERVICE_NAME, env: env.NODE_ENV, version: env.APP_VERSION },
    timestamp: () => `,"time":"${new Date().toISOString()}"`,
    formatters: { level: (label: string) => ({ level: label }) },
    redact: { paths: REDACT_PATHS, censor: "[redacted]" },
    serializers: { req: serializeRequest, err: serializeError },
    hooks: { logMethod: redactLogArguments },
  };
}
