/**
 * The Gemini API boundary shared by every capability this product uses (M23, ADR-034).
 *
 * Before M23 there was one Gemini consumer (TTS, M12) and its adapter owned the endpoint, the
 * retry policy and the HTTP error classification. There are now two — text-to-speech for the
 * offline media pipeline, and the AI Learning Coach — and a third (the Live API, for voice) is a
 * documented possibility. This module is the one place that knows:
 *
 * - the endpoint and the authentication header,
 * - which HTTP statuses the API documents as transient,
 * - how `Retry-After` and our own timeout interact.
 *
 * It deliberately knows **nothing** about what is being asked for: no model, no voice, no tool, no
 * response shape. Each capability's adapter owns its own request body and its own reading of the
 * response, so adding a capability cannot change how another one behaves.
 *
 * Verified against the official documentation on 2026-10-06 and confirmed by real calls (see
 * ADR-034): `POST https://generativelanguage.googleapis.com/v1beta/interactions`, header
 * `x-goog-api-key`. The key appears in that header only — never in a URL, a log or a response.
 */

export const GEMINI_INTERACTIONS_URL =
  "https://generativelanguage.googleapis.com/v1beta/interactions";

/** Documented as transient (retry with exponential backoff): rate limit, server error, overloaded, deadline. */
export const GEMINI_RETRYABLE_STATUSES: ReadonlySet<number> = new Set([429, 500, 503, 504]);

export const GEMINI_BASE_BACKOFF_MS = 500;
export const GEMINI_MAX_BACKOFF_MS = 8_000;

/** How a capability's adapter wants an HTTP status reported, in its own error vocabulary. */
export interface GeminiFailureTranslator<E extends Error> {
  /** 401/403/404/402 and anything else that means "this deployment is wrong". */
  configuration(detail: string): E;
  /** Another 4xx: the request itself is unacceptable. */
  rejected(detail: string): E;
  /** 5xx or a network error. */
  unavailable(detail: string): E;
  /** 429 specifically, so a caller can distinguish a quota from an outage. */
  rateLimited(): E;
}

/**
 * Translates a non-2xx status without ever reading the response body into the message: a provider
 * error body can contain the request's content, and these messages reach logs.
 */
export function translateGeminiStatus<E extends Error>(
  status: number,
  translate: GeminiFailureTranslator<E>,
): E {
  if (status === 429) return translate.rateLimited();
  if (status === 401 || status === 403) {
    return translate.configuration(`authentication failed (HTTP ${status})`);
  }
  if (status === 402) return translate.configuration(`billing required (HTTP ${status})`);
  if (status === 404)
    return translate.configuration(`model or endpoint not found (HTTP ${status})`);
  if (status >= 400 && status < 500) return translate.rejected(`HTTP ${status}`);
  return translate.unavailable(`HTTP ${status}`);
}

/** `Retry-After` in milliseconds, when the header is present and sane. */
export function geminiRetryAfterMs(response: Response): number | null {
  const header = response.headers.get("retry-after");
  if (header === null) return null;
  const seconds = Number(header);
  return Number.isFinite(seconds) && seconds >= 0 ? seconds * 1000 : null;
}

/** Our own `AbortSignal.timeout` firing — never retried: the abandoned call may still be billed. */
export function isGeminiTimeout(error: unknown): boolean {
  return error instanceof DOMException && error.name === "TimeoutError";
}

/** Exponential backoff for attempt `n`, honouring `Retry-After` within our cap. */
export function geminiBackoffMs(attempt: number, retryAfterMs: number | null): number {
  const backoff = GEMINI_BASE_BACKOFF_MS * 2 ** attempt;
  return Math.min(retryAfterMs ?? backoff, GEMINI_MAX_BACKOFF_MS);
}

/** One POST to the Interactions endpoint. The body is already serialised by the caller. */
export function postGeminiInteraction(
  body: string,
  options: { apiKey: string; timeoutMs: number; fetch: typeof fetch },
): Promise<Response> {
  return options.fetch(GEMINI_INTERACTIONS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": options.apiKey },
    body,
    signal: AbortSignal.timeout(options.timeoutMs),
  });
}
