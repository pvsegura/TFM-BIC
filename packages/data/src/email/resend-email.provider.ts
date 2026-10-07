import { randomUUID } from "node:crypto";

import { EmailDeliveryError, type EmailProvider, type OutgoingEmail } from "@tfm-bic/application";

/**
 * Resend adapter (ADR-014, M14 follow-up). Plain `fetch` against the documented REST endpoint —
 * no SDK, one request shape. Verified against Resend's official docs on 2026-10-07:
 * - `POST https://api.resend.com/emails`, `Authorization: Bearer <key>`; a `User-Agent` header is
 *   mandatory (requests without one are rejected with 403).
 * - Body: `from`, `to` (array), `subject`, `html`, `text`, `reply_to`, `headers`, `tags`.
 * - `Idempotency-Key` (≤ 256 chars, kept 24 h) — one per message, reused across retries, so a
 *   retry never sends the same email twice.
 * - Retryable per the error reference: 429 `rate_limit_exceeded`, 500, 503 (and network
 *   failures/timeouts). Never retried: auth, validation, quota (`daily_quota_exceeded`,
 *   `monthly_quota_exceeded`) errors.
 * The error body's shape is not documented, so only a `name` that looks like an error code is
 * read from it — never its message, which can echo an address.
 */
export const RESEND_EMAILS_ENDPOINT = "https://api.resend.com/emails";

const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_RETRY_DELAYS_MS = [500, 1500] as const;
const ERROR_CODE_PATTERN = /^[a-z][a-z_]{0,63}$/;

export interface ResendEmailProviderOptions {
  apiKey: string;
  /** Sent on every request (Resend refuses requests without one). */
  userAgent: string;
  timeoutMs?: number;
  /** Delay before each retry; its length is the maximum number of retries. */
  retryDelaysMs?: readonly number[];
  fetch?: typeof fetch;
}

class AttemptFailed {
  constructor(
    readonly reason: string,
    readonly retryable: boolean,
  ) {}
}

function isRetryableStatus(status: number, code: string | undefined): boolean {
  if (status === 429) {
    return code === "rate_limit_exceeded";
  }
  return status === 500 || status === 503 || status === 502 || status === 504;
}

async function errorCodeOf(response: Response): Promise<string | undefined> {
  try {
    const body: unknown = await response.json();
    if (typeof body === "object" && body !== null) {
      const name = (body as Record<string, unknown>).name;
      if (typeof name === "string" && ERROR_CODE_PATTERN.test(name)) {
        return name;
      }
    }
  } catch {
    // Not JSON: only the status is reported.
  }
  return undefined;
}

function delay(ms: number): Promise<void> {
  return ms <= 0 ? Promise.resolve() : new Promise((resolve) => setTimeout(resolve, ms));
}

export class ResendEmailProvider implements EmailProvider {
  readonly name = "resend";
  private readonly apiKey: string;
  private readonly userAgent: string;
  private readonly timeoutMs: number;
  private readonly retryDelaysMs: readonly number[];
  private readonly fetchFn: typeof fetch;

  constructor(options: ResendEmailProviderOptions) {
    if (options.apiKey.length === 0) {
      throw new Error("ResendEmailProvider needs an API key.");
    }
    this.apiKey = options.apiKey;
    this.userAgent = options.userAgent;
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.retryDelaysMs = options.retryDelaysMs ?? DEFAULT_RETRY_DELAYS_MS;
    this.fetchFn = options.fetch ?? fetch;
  }

  async send(message: OutgoingEmail): Promise<void> {
    const body = JSON.stringify(this.toRequestBody(message));
    const idempotencyKey = randomUUID();

    let last: AttemptFailed | undefined;
    for (let attempt = 0; attempt <= this.retryDelaysMs.length; attempt += 1) {
      if (attempt > 0) {
        await delay(this.retryDelaysMs[attempt - 1] ?? 0);
      }
      const outcome = await this.attempt(body, idempotencyKey);
      if (outcome === undefined) {
        return;
      }
      last = outcome;
      if (!outcome.retryable) {
        break;
      }
    }
    throw new EmailDeliveryError({ reason: last?.reason ?? "unknown" });
  }

  private async attempt(body: string, idempotencyKey: string): Promise<AttemptFailed | undefined> {
    let response: Response;
    try {
      response = await this.fetchFn(RESEND_EMAILS_ENDPOINT, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
          "User-Agent": this.userAgent,
          "Idempotency-Key": idempotencyKey,
        },
        body,
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (error) {
      const timedOut = error instanceof DOMException && error.name === "TimeoutError";
      return new AttemptFailed(timedOut ? "timeout" : "network", true);
    }
    if (response.ok) {
      return undefined;
    }
    const code = await errorCodeOf(response);
    const reason =
      code === undefined
        ? `http_${String(response.status)}`
        : `http_${String(response.status)}:${code}`;
    return new AttemptFailed(reason, isRetryableStatus(response.status, code));
  }

  private toRequestBody(message: OutgoingEmail): Record<string, unknown> {
    return {
      from: message.from,
      to: [message.to],
      subject: message.subject,
      html: message.html,
      text: message.text,
      ...(message.replyTo === null ? {} : { reply_to: message.replyTo }),
      ...(message.listUnsubscribeUrl === null
        ? {}
        : {
            headers: {
              "List-Unsubscribe": `<${message.listUnsubscribeUrl}>`,
              "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
            },
          }),
      tags: [
        { name: "category", value: message.category },
        { name: "template", value: message.template },
      ],
    };
  }
}
