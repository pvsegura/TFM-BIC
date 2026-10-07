import type { EmailCategory, EmailTemplateId } from "@tfm-bic/domain";

/**
 * What the senders report after each attempt — for a structured log line. It carries no
 * recipient, subject, link or token: only which kind of email, through which adapter, and the
 * outcome.
 */
export interface EmailDeliveryEvent {
  readonly category: EmailCategory;
  readonly template: EmailTemplateId;
  readonly provider: string;
  readonly outcome: "accepted" | "failed";
  /** Failed attempts only: the adapter's log-safe reason, when it gave one. */
  readonly reason?: string;
}

export interface EmailDeliveryObserver {
  record(event: EmailDeliveryEvent): void;
}
