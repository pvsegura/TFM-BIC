import type { User } from "@verbysia/domain";

import type { PaymentNotice, PaymentNotifier } from "../commerce/payments.js";
import type { TransactionalEmailSender } from "./email-senders.js";

/** Where each email's button leads, relative to the configured app URL. */
export const PAYMENT_EMAIL_PATHS = {
  course: "/learn/lessons",
  billing: "/profile",
  pricing: "/cennik",
} as const;

/**
 * Sends the commerce notices as transactional email (receipt, failed payment, ended
 * subscription). The address comes from the account, never from the provider's event. Failures
 * are reported through `onError` and swallowed: the access change has already happened.
 */
export class EmailPaymentNotifier implements PaymentNotifier {
  constructor(
    private readonly users: { findById(id: string): Promise<User | null> },
    private readonly sender: TransactionalEmailSender,
    private readonly appBaseUrl: string,
    private readonly onError: (error: unknown, notice: PaymentNotice["kind"]) => void = () =>
      undefined,
  ) {}

  async notify(notice: PaymentNotice): Promise<void> {
    try {
      const user = await this.users.findById(notice.userId);
      if (!user) return;
      const base = this.appBaseUrl.replace(/\/$/, "");
      switch (notice.kind) {
        case "purchase_confirmed":
          await this.sender.send(user.email, {
            template: "purchase-confirmation",
            variables: {
              productName: notice.productName,
              amountMinor: notice.amountMinor,
              currency: notice.currency,
              courseUrl: `${base}${PAYMENT_EMAIL_PATHS.course}`,
            },
          });
          return;
        case "payment_failed":
          await this.sender.send(user.email, {
            template: "payment-failed",
            variables: {
              productName: notice.productName,
              billingUrl: `${base}${PAYMENT_EMAIL_PATHS.billing}`,
            },
          });
          return;
        case "subscription_ended":
          await this.sender.send(user.email, {
            template: "subscription-ended",
            variables: {
              productName: notice.productName,
              pricingUrl: `${base}${PAYMENT_EMAIL_PATHS.pricing}`,
            },
          });
          return;
      }
    } catch (error) {
      this.onError(error, notice.kind);
    }
  }
}
