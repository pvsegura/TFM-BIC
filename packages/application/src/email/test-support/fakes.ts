import type {
  EmailDeliveryEvent,
  EmailDeliveryObserver,
} from "../ports/email-delivery-observer.js";
import type { EmailProvider, OutgoingEmail } from "../ports/email-provider.js";
import type { UnsubscribeTokenCodec } from "../ports/unsubscribe-token-codec.js";

/** Test-only doubles for the email ports. Not exported from the package index. */

export class RecordingEmailProvider implements EmailProvider {
  readonly name = "recording";
  readonly sent: OutgoingEmail[] = [];
  private failures = 0;

  /** The next `count` sends reject, as an unavailable provider would. */
  failNext(count = 1): void {
    this.failures = count;
  }

  send(message: OutgoingEmail): Promise<void> {
    if (this.failures > 0) {
      this.failures -= 1;
      return Promise.reject(new Error("provider down (contains no secrets)"));
    }
    this.sent.push(message);
    return Promise.resolve();
  }
}

export class RecordingDeliveryObserver implements EmailDeliveryObserver {
  readonly events: EmailDeliveryEvent[] = [];
  record(event: EmailDeliveryEvent): void {
    this.events.push(event);
  }
}

/** Reversible and obviously fake: "signed:<key>". */
export class FakeUnsubscribeTokenCodec implements UnsubscribeTokenCodec {
  encode(unsubscribeKey: string): string {
    return `signed.${unsubscribeKey}`;
  }
  decode(token: string): string | null {
    return token.startsWith("signed.") ? token.slice("signed.".length) : null;
  }
}
