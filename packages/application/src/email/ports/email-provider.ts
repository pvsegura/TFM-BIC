import type { EmailCategory, EmailTemplateId } from "@tfm-bic/domain";

/**
 * A fully rendered, provider-independent message (M14). Adapters translate it into their own API;
 * nothing provider-specific (SDK types, template ids, tags) appears here or above it.
 */
export interface OutgoingEmail {
  readonly to: string;
  readonly from: string;
  readonly replyTo: string | null;
  readonly subject: string;
  readonly html: string;
  readonly text: string;
  readonly category: EmailCategory;
  readonly template: EmailTemplateId;
  /**
   * Marketing only: the one-click unsubscribe endpoint for the standard `List-Unsubscribe` /
   * `List-Unsubscribe-Post` headers (RFC 2369, RFC 8058). `null` for transactional email.
   */
  readonly listUnsubscribeUrl: string | null;
}

/**
 * The infrastructure boundary to an email provider. Implementations throw `EmailDeliveryError`
 * (or anything else, which the senders wrap into one) when the provider does not accept the
 * message. Resolving means "accepted by the provider", not "delivered to the inbox".
 */
export interface EmailProvider {
  /** Short adapter name for logs, e.g. "fake". */
  readonly name: string;
  send(message: OutgoingEmail): Promise<void>;
}
