import {
  confirmSubscription,
  decideSubscriptionRequest,
  InvalidNewsletterTokenError,
  markConfirmationUnsent,
  NEWSLETTER_CONSENT_VERSION,
  newsletterPreferenceOf,
  startPendingSubscription,
  unsubscribe,
  type NewsletterPreference,
} from "@tfm-bic/domain";

import { EmailDeliveryError } from "../../email/email-delivery.error.js";
import {
  NEWSLETTER_CONFIRM_PAGE_PATH,
  type TransactionalEmailSender,
} from "../../email/email-senders.js";
import type { UnsubscribeTokenCodec } from "../../email/ports/unsubscribe-token-codec.js";
import type { TokenGenerator } from "../../identity/ports/token-generator.js";
import type { Clock } from "../../ports/clock.js";
import { NewsletterConsentVersionMismatchError } from "../newsletter-consent-version-mismatch.error.js";
import type { NewsletterSubscriptionRepository } from "../ports/newsletter-subscription-repository.js";

/**
 * Email preferences (M14). Two categories, deliberately not symmetrical:
 * - essential (transactional) email is always on and cannot be switched off here — it carries
 *   account and security messages;
 * - the newsletter (marketing) is off unless the user subscribed and confirmed.
 */
export interface EmailPreferences {
  readonly essential: { readonly enabled: true; readonly required: true };
  readonly newsletter: NewsletterPreference;
}

const ESSENTIAL = { enabled: true, required: true } as const;

export class GetEmailPreferencesUseCase {
  constructor(private readonly repository: NewsletterSubscriptionRepository) {}

  async execute(input: { userId: string }): Promise<EmailPreferences> {
    const subscription = await this.repository.findByUserId(input.userId);
    return { essential: ESSENTIAL, newsletter: newsletterPreferenceOf(subscription) };
  }
}

export interface RequestNewsletterSubscriptionInput {
  /** The signed-in user — from the session, never from the request body. */
  readonly user: { readonly id: string; readonly email: string };
  /** The consent text version the user was shown and agreed to. */
  readonly consentVersion: string;
}

export interface RequestNewsletterSubscriptionResult {
  readonly newsletter: NewsletterPreference;
  /** `false` when nothing was sent: already subscribed, or a link was sent moments ago. */
  readonly confirmationEmailSent: boolean;
}

/**
 * Step 1 of the double opt-in: records a pending request and emails a single-use, expiring
 * confirmation link (a transactional email — no marketing consent exists yet). Nothing marketing
 * is ever sent to a pending request.
 *
 * Provider failure: the pending request is kept, marked "not sent" so an immediate retry sends a
 * new link, and `EmailDeliveryError` propagates — here the user is signed in and asking about
 * their own address, so telling them it failed reveals nothing.
 */
export class RequestNewsletterSubscriptionUseCase {
  constructor(
    private readonly repository: NewsletterSubscriptionRepository,
    private readonly tokenGenerator: TokenGenerator,
    private readonly sender: TransactionalEmailSender,
    private readonly clock: Clock,
    private readonly appBaseUrl: string,
  ) {}

  async execute(
    input: RequestNewsletterSubscriptionInput,
  ): Promise<RequestNewsletterSubscriptionResult> {
    if (input.consentVersion !== NEWSLETTER_CONSENT_VERSION) {
      throw new NewsletterConsentVersionMismatchError();
    }
    const now = this.clock.now();
    const current = await this.repository.findByUserId(input.user.id);
    const decision = decideSubscriptionRequest(current, now);
    if (current !== null && decision !== "send_confirmation") {
      return { newsletter: newsletterPreferenceOf(current), confirmationEmailSent: false };
    }

    const unsubscribeKey = this.tokenGenerator.generate();
    const rawToken = this.tokenGenerator.generate();
    const pending = startPendingSubscription(current, {
      userId: input.user.id,
      unsubscribeKey,
      confirmationTokenHash: this.tokenGenerator.hash(rawToken),
      consentSource: "settings",
      now,
    });
    await this.repository.save(pending);

    try {
      await this.sender.send(input.user.email, {
        template: "newsletter-confirmation",
        variables: {
          confirmationUrl: `${this.appBaseUrl}${NEWSLETTER_CONFIRM_PAGE_PATH}?token=${encodeURIComponent(rawToken)}`,
        },
      });
    } catch (error) {
      if (error instanceof EmailDeliveryError) {
        await this.repository.save(markConfirmationUnsent(pending));
      }
      throw error;
    }

    return { newsletter: newsletterPreferenceOf(pending), confirmationEmailSent: true };
  }
}

/** Step 2 of the double opt-in: the emailed link, no login needed (the token is the proof). */
export class ConfirmNewsletterSubscriptionUseCase {
  constructor(
    private readonly repository: NewsletterSubscriptionRepository,
    private readonly tokenGenerator: TokenGenerator,
    private readonly clock: Clock,
  ) {}

  async execute(input: { token: string }): Promise<NewsletterPreference> {
    const tokenHash = this.tokenGenerator.hash(input.token);
    const subscription = await this.repository.findByConfirmationTokenHash(tokenHash);
    if (subscription === null) {
      throw new InvalidNewsletterTokenError();
    }
    const confirmed = confirmSubscription(subscription, tokenHash, this.clock.now());
    await this.repository.save(confirmed);
    return newsletterPreferenceOf(confirmed);
  }
}

/** Unsubscribe from the signed-in settings page. Idempotent; never creates a record. */
export class UnsubscribeFromNewsletterUseCase {
  constructor(
    private readonly repository: NewsletterSubscriptionRepository,
    private readonly clock: Clock,
  ) {}

  async execute(input: { userId: string }): Promise<NewsletterPreference> {
    const subscription = await this.repository.findByUserId(input.userId);
    if (subscription === null) {
      return newsletterPreferenceOf(null);
    }
    const withdrawn = unsubscribe(subscription, this.clock.now());
    if (withdrawn !== subscription) {
      await this.repository.save(withdrawn);
    }
    return newsletterPreferenceOf(withdrawn);
  }
}

/**
 * Unsubscribe from a link in a newsletter (or a mail client's one-click button) — no login, no
 * password: the signed token is the authorization, and all it can do is withdraw consent.
 * Idempotent, and quiet about records that no longer exist.
 */
export class UnsubscribeWithTokenUseCase {
  constructor(
    private readonly repository: NewsletterSubscriptionRepository,
    private readonly tokenCodec: UnsubscribeTokenCodec,
    private readonly clock: Clock,
  ) {}

  async execute(input: { token: string }): Promise<{ status: "not_subscribed" }> {
    const unsubscribeKey = this.tokenCodec.decode(input.token);
    if (unsubscribeKey === null) {
      throw new InvalidNewsletterTokenError();
    }
    const subscription = await this.repository.findByUnsubscribeKey(unsubscribeKey);
    if (subscription !== null) {
      const withdrawn = unsubscribe(subscription, this.clock.now());
      if (withdrawn !== subscription) {
        await this.repository.save(withdrawn);
      }
    }
    return { status: "not_subscribed" };
  }
}
