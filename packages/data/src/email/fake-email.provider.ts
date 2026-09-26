import { EmailDeliveryError, type EmailProvider, type OutgoingEmail } from "@tfm-bic/application";
import type { EmailTemplateId } from "@tfm-bic/domain";

export interface CapturedEmail extends OutgoingEmail {
  /** Absolute links found in the text part, in order — what a test would "click". */
  readonly links: readonly string[];
  readonly capturedAt: Date;
}

const LINK_PATTERN = /https?:\/\/[^\s<>"]+/g;
const DEFAULT_CAPACITY = 500;

/**
 * The default `EmailProvider` in every environment until a real provider is selected (ADR-014
 * PENDING) — and always in tests, CI and E2E. Sends nothing anywhere: it keeps the most recent
 * messages in memory (never logs them, since they contain tokens) so tests, and the
 * NODE_ENV=test-only inbox route, can read the links a real email would have carried.
 */
export class FakeEmailProvider implements EmailProvider {
  readonly name = "fake";
  private readonly captured: CapturedEmail[] = [];
  private readonly capacity: number;
  private pendingFailures = 0;

  constructor(options: { capacity?: number } = {}) {
    this.capacity = options.capacity ?? DEFAULT_CAPACITY;
  }

  send(message: OutgoingEmail): Promise<void> {
    if (this.pendingFailures > 0) {
      this.pendingFailures -= 1;
      return Promise.reject(
        new EmailDeliveryError({ cause: new Error("Fake provider unavailable.") }),
      );
    }
    this.captured.push({
      ...message,
      links: message.text.match(LINK_PATTERN) ?? [],
      capturedAt: new Date(),
    });
    if (this.captured.length > this.capacity) {
      this.captured.shift();
    }
    return Promise.resolve();
  }

  /** Test support: the next `count` sends reject as an unavailable provider would. */
  failNext(count: number): void {
    this.pendingFailures = count;
  }

  all(): readonly CapturedEmail[] {
    return [...this.captured];
  }

  findLastSentTo(to: string, template?: EmailTemplateId): CapturedEmail | undefined {
    const wanted = to.trim().toLowerCase();
    for (let i = this.captured.length - 1; i >= 0; i -= 1) {
      const email = this.captured[i];
      if (
        email?.to.toLowerCase() === wanted &&
        (template === undefined || email.template === template)
      ) {
        return email;
      }
    }
    return undefined;
  }

  clear(): void {
    this.captured.length = 0;
  }
}
