import { InvalidNewsletterTokenError } from "./errors/invalid-newsletter-token.error.js";
import { MarketingConsentRequiredError } from "./errors/marketing-consent-required.error.js";
import { NewsletterTokenExpiredError } from "./errors/newsletter-token-expired.error.js";

/**
 * Newsletter consent (M14, ADR-014 / ADR-025). Deliberately separate from the account: creating
 * an account never creates a subscription, and no transactional email depends on this record.
 *
 * Double opt-in: a request is `pending` until the user follows the emailed confirmation link;
 * only then is it `subscribed` — the only state that may receive marketing email. Unsubscribing
 * (or cancelling a pending request) moves it to `unsubscribed`; a later request starts again.
 *
 * Recorded consent metadata is the minimum useful set: which consent text (version), where it
 * was given (source), when it was requested, confirmed and withdrawn. No IP address or user
 * agent is kept. Whether this is sufficient evidence of consent is PENDING legal review.
 */
export type NewsletterStatus = "pending" | "subscribed" | "unsubscribed";

/** Where the request was made. Only the authenticated settings page exists in M14. */
export type NewsletterConsentSource = "settings";

/**
 * Identifies the consent wording the user was shown. Change it whenever the wording in the web
 * app's newsletter section changes, so each record says which text was agreed to.
 */
export const NEWSLETTER_CONSENT_VERSION = "newsletter-consent-2026-09";

/** How long a confirmation link stays valid. */
export const CONFIRMATION_TOKEN_TTL_MS = 48 * 60 * 60 * 1000;

/**
 * A repeated request inside this window (a double click, a retried request) does not send a
 * second confirmation email — the first link is still valid.
 */
export const CONFIRMATION_RESEND_COOLDOWN_MS = 60 * 1000;

export interface NewsletterSubscription {
  readonly userId: string;
  readonly status: NewsletterStatus;
  /**
   * Random, opaque, stable for the life of the record: what signed unsubscribe links identify.
   * Never the user id.
   */
  readonly unsubscribeKey: string;
  readonly consentVersion: string;
  readonly consentSource: NewsletterConsentSource;
  readonly requestedAt: Date;
  readonly confirmedAt: Date | null;
  readonly unsubscribedAt: Date | null;
  /** SHA-256 of the pending confirmation token; `null` once used, cancelled or never issued. */
  readonly confirmationTokenHash: string | null;
  readonly confirmationExpiresAt: Date | null;
  /** When the confirmation email was last handed to the provider; `null` if delivery failed. */
  readonly confirmationSentAt: Date | null;
}

export type SubscriptionRequestDecision =
  "send_confirmation" | "confirmation_recently_sent" | "already_subscribed";

export function decideSubscriptionRequest(
  current: NewsletterSubscription | null,
  now: Date,
): SubscriptionRequestDecision {
  if (current?.status === "subscribed") {
    return "already_subscribed";
  }
  if (
    current?.status === "pending" &&
    current.confirmationSentAt !== null &&
    now.getTime() - current.confirmationSentAt.getTime() < CONFIRMATION_RESEND_COOLDOWN_MS
  ) {
    return "confirmation_recently_sent";
  }
  return "send_confirmation";
}

export interface StartPendingSubscriptionInput {
  readonly userId: string;
  /** Used only when there is no record yet; an existing record keeps its key. */
  readonly unsubscribeKey: string;
  readonly confirmationTokenHash: string;
  readonly consentSource: NewsletterConsentSource;
  readonly now: Date;
}

/** A new (or renewed) pending request with a fresh confirmation token. */
export function startPendingSubscription(
  current: NewsletterSubscription | null,
  input: StartPendingSubscriptionInput,
): NewsletterSubscription {
  if (current?.status === "subscribed") {
    throw new Error("The newsletter subscription is already subscribed.");
  }
  return {
    userId: input.userId,
    status: "pending",
    unsubscribeKey: current?.unsubscribeKey ?? input.unsubscribeKey,
    consentVersion: NEWSLETTER_CONSENT_VERSION,
    consentSource: input.consentSource,
    requestedAt: input.now,
    confirmedAt: null,
    unsubscribedAt: null,
    confirmationTokenHash: input.confirmationTokenHash,
    confirmationExpiresAt: new Date(input.now.getTime() + CONFIRMATION_TOKEN_TTL_MS),
    confirmationSentAt: input.now,
  };
}

/** The confirmation email could not be delivered: allow an immediate retry. */
export function markConfirmationUnsent(
  subscription: NewsletterSubscription,
): NewsletterSubscription {
  return { ...subscription, confirmationSentAt: null };
}

/**
 * Consumes the confirmation token (single use). `tokenHash` is the hash of the token the user
 * presented; the repository looked the record up by it, and it is checked again here so the rule
 * does not depend on how the record was found.
 */
export function confirmSubscription(
  subscription: NewsletterSubscription,
  tokenHash: string,
  now: Date,
): NewsletterSubscription {
  if (
    subscription.status !== "pending" ||
    subscription.confirmationTokenHash === null ||
    subscription.confirmationTokenHash !== tokenHash
  ) {
    throw new InvalidNewsletterTokenError();
  }
  if (
    subscription.confirmationExpiresAt === null ||
    now.getTime() >= subscription.confirmationExpiresAt.getTime()
  ) {
    throw new NewsletterTokenExpiredError();
  }
  return {
    ...subscription,
    status: "subscribed",
    confirmedAt: now,
    confirmationTokenHash: null,
    confirmationExpiresAt: null,
  };
}

/** Withdraws consent (or cancels a pending request). Idempotent: returns the same object if already done. */
export function unsubscribe(
  subscription: NewsletterSubscription,
  now: Date,
): NewsletterSubscription {
  if (subscription.status === "unsubscribed") {
    return subscription;
  }
  return {
    ...subscription,
    status: "unsubscribed",
    unsubscribedAt: now,
    confirmationTokenHash: null,
    confirmationExpiresAt: null,
  };
}

export function canReceiveMarketing(subscription: NewsletterSubscription | null): boolean {
  return subscription?.status === "subscribed";
}

declare const marketingRecipientBrand: unique symbol;

/**
 * The only shape a marketing email can be addressed to. The brand exists only in the type system,
 * so the one way to get a value is `toMarketingRecipient`, which checks consent.
 */
export interface MarketingRecipient {
  readonly email: string;
  readonly unsubscribeKey: string;
  readonly [marketingRecipientBrand]: true;
}

export function toMarketingRecipient(
  subscription: NewsletterSubscription,
  email: string,
): MarketingRecipient {
  if (!canReceiveMarketing(subscription)) {
    throw new MarketingConsentRequiredError();
  }
  return { email, unsubscribeKey: subscription.unsubscribeKey } as MarketingRecipient;
}

export type NewsletterPreferenceStatus = "not_subscribed" | "pending" | "subscribed";

export interface NewsletterPreference {
  readonly status: NewsletterPreferenceStatus;
  /** When the current state began (requested, confirmed or withdrawn); `null` if never subscribed. */
  readonly since: Date | null;
}

export function newsletterPreferenceOf(
  subscription: NewsletterSubscription | null,
): NewsletterPreference {
  if (subscription === null) {
    return { status: "not_subscribed", since: null };
  }
  switch (subscription.status) {
    case "pending":
      return { status: "pending", since: subscription.requestedAt };
    case "subscribed":
      return { status: "subscribed", since: subscription.confirmedAt };
    case "unsubscribed":
      return { status: "not_subscribed", since: subscription.unsubscribedAt };
  }
}
