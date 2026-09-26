import { toMarketingRecipient } from "@tfm-bic/domain";

import { EmailDeliveryError } from "../../email/email-delivery.error.js";
import type { MarketingEmailSender } from "../../email/email-senders.js";
import { renderEmail, type NewsletterIssueContent } from "../../email/templates/render-email.js";
import type { NewsletterSubscriptionRepository } from "../ports/newsletter-subscription-repository.js";

export interface SendNewsletterIssueResult {
  readonly recipients: number;
  readonly accepted: number;
  readonly failed: number;
}

/** Placeholder origin used only to validate content before the first send. */
const VALIDATION_ORIGIN = "https://validation.invalid";

/**
 * The newsletter sending boundary (M14): one plain-text issue to every confirmed subscription,
 * sequentially, through the marketing sender (which adds each recipient's unsubscribe link).
 * Not a campaign system — no scheduling, segmentation, tracking or retries. A failed delivery is
 * counted and skipped; the sender's observer reports it. Re-running would re-send to everyone, so
 * an operator should not re-run after a partial failure without deciding that explicitly.
 */
export class SendNewsletterIssueUseCase {
  constructor(
    private readonly repository: NewsletterSubscriptionRepository,
    private readonly sender: MarketingEmailSender,
  ) {}

  async execute(content: NewsletterIssueContent): Promise<SendNewsletterIssueResult> {
    // Fail fast on bad content, before anyone receives anything.
    renderEmail(
      {
        template: "newsletter-issue",
        variables: { ...content, unsubscribeUrl: `${VALIDATION_ORIGIN}/u` },
      },
      { appBaseUrl: VALIDATION_ORIGIN, locale: "en" },
    );

    const subscribed = await this.repository.listSubscribed();
    let accepted = 0;
    let failed = 0;
    for (const { subscription, email } of subscribed) {
      try {
        await this.sender.send(toMarketingRecipient(subscription, email), content);
        accepted += 1;
      } catch (error) {
        if (!(error instanceof EmailDeliveryError)) {
          throw error;
        }
        failed += 1;
      }
    }
    return { recipients: subscribed.length, accepted, failed };
  }
}
