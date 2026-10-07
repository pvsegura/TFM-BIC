import {
  categoryOfTemplate,
  type MarketingRecipient,
  type TransactionalTemplateId,
} from "@tfm-bic/domain";

import { EmailDeliveryError } from "./email-delivery.error.js";
import type { EmailDeliveryObserver } from "./ports/email-delivery-observer.js";
import type { EmailProvider, OutgoingEmail } from "./ports/email-provider.js";
import type { UnsubscribeTokenCodec } from "./ports/unsubscribe-token-codec.js";
import type { EmailLocale } from "./templates/messages.js";
import {
  renderEmail,
  type EmailTemplateRequest,
  type NewsletterIssueContent,
  type RenderedEmail,
} from "./templates/render-email.js";

export interface EmailSenderConfig {
  /** The configured sender, e.g. `TFM-BIC <no-reply@example.com>`. */
  readonly from: string;
  readonly replyTo: string | null;
  /** The configured public app URL — the only origin email links may point at. */
  readonly appBaseUrl: string;
  readonly locale: EmailLocale;
}

/** A transactional template request — the type excludes every marketing template. */
export type TransactionalEmailRequest = Extract<
  EmailTemplateRequest,
  { template: TransactionalTemplateId }
>;

/**
 * Account, security and service email. Needs no marketing consent and offers no unsubscribe —
 * and cannot send a newsletter: its request type only admits transactional templates.
 */
export interface TransactionalEmailSender {
  send(to: string, request: TransactionalEmailRequest): Promise<void>;
}

/**
 * Newsletter email. Addressed to a `MarketingRecipient`, which only exists for a confirmed
 * subscription, so marketing without consent does not type-check; every message it sends carries
 * an unsubscribe link and the one-click unsubscribe URL.
 */
export interface MarketingEmailSender {
  send(recipient: MarketingRecipient, content: NewsletterIssueContent): Promise<void>;
}

/** Page the unsubscribe link in the email body opens (asks for a click, then calls the API). */
export const UNSUBSCRIBE_PAGE_PATH = "/newsletter/unsubscribe";
/** API endpoint mail clients POST to for RFC 8058 one-click unsubscribe. */
export const ONE_CLICK_UNSUBSCRIBE_PATH = "/email-preferences/newsletter/unsubscribe";
/** Page the confirmation link opens. */
export const NEWSLETTER_CONFIRM_PAGE_PATH = "/newsletter/confirm";

async function deliver(
  provider: EmailProvider,
  observer: EmailDeliveryObserver | undefined,
  config: EmailSenderConfig,
  to: string,
  rendered: RenderedEmail,
  listUnsubscribeUrl: string | null,
): Promise<void> {
  const category = categoryOfTemplate(rendered.template);
  const message: OutgoingEmail = {
    to,
    from: config.from,
    replyTo: config.replyTo,
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
    category,
    template: rendered.template,
    listUnsubscribeUrl,
  };
  try {
    await provider.send(message);
  } catch (error) {
    const reason = error instanceof EmailDeliveryError ? error.reason : undefined;
    observer?.record({
      category,
      template: rendered.template,
      provider: provider.name,
      outcome: "failed",
      ...(reason === undefined ? {} : { reason }),
    });
    throw error instanceof EmailDeliveryError ? error : new EmailDeliveryError({ cause: error });
  }
  observer?.record({
    category,
    template: rendered.template,
    provider: provider.name,
    outcome: "accepted",
  });
}

export class ProviderTransactionalEmailSender implements TransactionalEmailSender {
  constructor(
    private readonly provider: EmailProvider,
    private readonly config: EmailSenderConfig,
    private readonly observer?: EmailDeliveryObserver,
  ) {}

  async send(to: string, request: TransactionalEmailRequest): Promise<void> {
    const rendered = renderEmail(request, this.config);
    await deliver(this.provider, this.observer, this.config, to, rendered, null);
  }
}

export class ProviderMarketingEmailSender implements MarketingEmailSender {
  constructor(
    private readonly provider: EmailProvider,
    private readonly config: EmailSenderConfig,
    private readonly unsubscribeTokens: UnsubscribeTokenCodec,
    private readonly observer?: EmailDeliveryObserver,
  ) {}

  async send(recipient: MarketingRecipient, content: NewsletterIssueContent): Promise<void> {
    const token = encodeURIComponent(this.unsubscribeTokens.encode(recipient.unsubscribeKey));
    const rendered = renderEmail(
      {
        template: "newsletter-issue",
        variables: {
          ...content,
          unsubscribeUrl: `${this.config.appBaseUrl}${UNSUBSCRIBE_PAGE_PATH}?token=${token}`,
        },
      },
      this.config,
    );
    await deliver(
      this.provider,
      this.observer,
      this.config,
      recipient.email,
      rendered,
      `${this.config.appBaseUrl}${ONE_CLICK_UNSUBSCRIBE_PATH}?token=${token}`,
    );
  }
}
