/**
 * Argument parsing for tool calls (M23, ADR-034).
 *
 * The model's `arguments` are untrusted: a declared schema is a hint to the model, not a guarantee
 * about what arrives. Every tool parses its arguments through these helpers before touching an
 * application service, so a missing, mistyped, over-long or unexpected value becomes a refusal the
 * model can read and correct — never an exception, and never a value passed on to a repository.
 *
 * Hand-rolled rather than Zod on purpose: `packages/application` depends on `packages/domain` and
 * nothing else (ADR-001's dependency rule), and these five checks are all a tool needs. The
 * on-the-wire API shapes are still Zod, in `packages/contracts`, where they belong.
 */

export class ToolArgumentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ToolArgumentError";
  }
}

function fields(args: unknown): Record<string, unknown> {
  if (typeof args !== "object" || args === null || Array.isArray(args)) {
    throw new ToolArgumentError("arguments must be an object");
  }
  return args as Record<string, unknown>;
}

/**
 * Reads the named fields and refuses anything else. An unexpected field is an error rather than
 * something ignored: a tool that quietly drops `userId` would read as if it honoured it.
 */
export function readArguments(args: unknown, allowed: readonly string[]): Record<string, unknown> {
  const record = fields(args);
  const unexpected = Object.keys(record).filter((key) => !allowed.includes(key));
  if (unexpected.length > 0) {
    throw new ToolArgumentError(
      `unexpected argument(s): ${unexpected.join(", ")}. This tool accepts: ${allowed.join(", ") || "no arguments"}`,
    );
  }
  return record;
}

/** A non-empty string within `maxLength`, trimmed. Control characters are refused. */
export function requiredString(
  record: Record<string, unknown>,
  name: string,
  maxLength = 120,
): string {
  const value = record[name];
  if (typeof value !== "string") {
    throw new ToolArgumentError(`"${name}" is required and must be a string`);
  }
  const trimmed = value.trim();
  if (trimmed === "") {
    throw new ToolArgumentError(`"${name}" must not be empty`);
  }
  if (trimmed.length > maxLength) {
    throw new ToolArgumentError(`"${name}" must be at most ${maxLength} characters`);
  }
  // eslint-disable-next-line no-control-regex -- refusing control characters is the point.
  if (/[\u0000-\u001f\u007f]/.test(trimmed)) {
    throw new ToolArgumentError(`"${name}" must not contain control characters`);
  }
  return trimmed;
}

export function optionalString(
  record: Record<string, unknown>,
  name: string,
  maxLength = 120,
): string | undefined {
  return record[name] === undefined || record[name] === null
    ? undefined
    : requiredString(record, name, maxLength);
}

/** One of a fixed set of values. The set is ours, so a model cannot widen it. */
export function optionalEnum<T extends string>(
  record: Record<string, unknown>,
  name: string,
  allowed: readonly T[],
): T | undefined {
  const value = record[name];
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "string" || !allowed.some((candidate) => candidate === value)) {
    throw new ToolArgumentError(`"${name}" must be one of: ${allowed.join(", ")}`);
  }
  return value as T;
}

/** A whole number, clamped into `[min, max]` rather than refused: a model asking for 100 items
 * means "as many as you can", and answering with 10 is more useful than an error. */
export function optionalCount(
  record: Record<string, unknown>,
  name: string,
  { min, max, fallback }: { min: number; max: number; fallback: number },
): number {
  const value = record[name];
  if (value === undefined || value === null) return fallback;
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) {
    throw new ToolArgumentError(`"${name}" must be a number`);
  }
  return Math.min(max, Math.max(min, Math.trunc(parsed)));
}
