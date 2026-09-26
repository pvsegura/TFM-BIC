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

/**
 * The API's logger configuration. Never log secrets or unnecessary personal data — see
 * docs/security/security-baseline.md and docs/privacy/DATA-CLASSIFICATION.md.
 *
 * - Cookies, the authorization header and `set-cookie` are redacted.
 * - Request logs carry no query string (M14: one-click unsubscribe links carry a token there).
 * - Errors are serialized from an allowlist, and log messages are scrubbed, so bound SQL
 *   parameters and driver `detail` never reach a log line (M15).
 */
export function createLoggerOptions(nodeEnv: AppEnv["NODE_ENV"]) {
  return {
    level: nodeEnv === "test" ? "silent" : "info",
    redact: ["req.headers.authorization", "req.headers.cookie", "res.headers['set-cookie']"],
    serializers: { req: serializeRequest, err: serializeError },
    hooks: { logMethod: redactLogArguments },
  };
}
