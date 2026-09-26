/** What an error becomes in a log line. */
export interface SerializedError {
  [key: string]: unknown;
  type: string;
  message: string;
  stack: string;
  code?: string;
  statusCode?: number;
  cause?: SerializedError;
}

/** How many `cause` links are followed; deeper chains are cut off. */
const MAX_CAUSE_DEPTH = 3;

/**
 * drizzle-orm's `DrizzleQueryError` message is `Failed query: <sql>\nparams: <values>` — the
 * bound values can be an email address, a password hash or a token hash. The SQL text is kept
 * (it is useful and carries no values); the values are not.
 */
export function redactParams(text: string): string {
  return text.replace(/^params: .*$/m, "params: [redacted]");
}

/**
 * Replaces Fastify/Pino's default `err` serializer (M15). The default copies every enumerable
 * property of an error — including drizzle's `params` and Postgres' `detail`
 * (`Key (normalized_email)=(…) already exists.`) — into the log. This keeps only an allowlist:
 * type, message (parameters redacted), stack (the same), `code`, `statusCode` and a short
 * `cause` chain serialized the same way. See docs/privacy/ (logging) and ADR-026.
 */
export function serializeError(error: unknown, depth = 0): SerializedError {
  if (!(error instanceof Error)) {
    return { type: typeof error, message: redactParams(String(error)), stack: "" };
  }
  const serialized: SerializedError = {
    type: error.name,
    message: redactParams(error.message),
    stack: redactParams(error.stack ?? ""),
  };
  const { code, statusCode } = error as { code?: unknown; statusCode?: unknown };
  if (typeof code === "string") {
    serialized.code = code;
  }
  if (typeof statusCode === "number") {
    serialized.statusCode = statusCode;
  }
  if (error.cause !== undefined && depth < MAX_CAUSE_DEPTH) {
    serialized.cause = serializeError(error.cause, depth + 1);
  }
  return serialized;
}
