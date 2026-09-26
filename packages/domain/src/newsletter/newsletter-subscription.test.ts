import { describe, expect, it } from "vitest";

import { InvalidNewsletterTokenError } from "./errors/invalid-newsletter-token.error.js";
import { MarketingConsentRequiredError } from "./errors/marketing-consent-required.error.js";
import { NewsletterTokenExpiredError } from "./errors/newsletter-token-expired.error.js";
import {
  canReceiveMarketing,
  confirmSubscription,
  CONFIRMATION_RESEND_COOLDOWN_MS,
  CONFIRMATION_TOKEN_TTL_MS,
  decideSubscriptionRequest,
  markConfirmationUnsent,
  newsletterPreferenceOf,
  NEWSLETTER_CONSENT_VERSION,
  startPendingSubscription,
  toMarketingRecipient,
  unsubscribe,
  type NewsletterSubscription,
} from "./newsletter-subscription.js";

const NOW = new Date("2026-09-26T10:00:00.000Z");

function later(ms: number): Date {
  return new Date(NOW.getTime() + ms);
}

function pending(): NewsletterSubscription {
  return startPendingSubscription(null, {
    userId: "user-1",
    unsubscribeKey: "key-1",
    confirmationTokenHash: "hash-1",
    consentSource: "settings",
    now: NOW,
  });
}

function subscribed(): NewsletterSubscription {
  return confirmSubscription(pending(), "hash-1", later(1000));
}

describe("decideSubscriptionRequest", () => {
  it("sends a confirmation when there is no subscription yet", () => {
    expect(decideSubscriptionRequest(null, NOW)).toBe("send_confirmation");
  });

  it("does nothing for an already confirmed subscription", () => {
    expect(decideSubscriptionRequest(subscribed(), later(5000))).toBe("already_subscribed");
  });

  it("does not resend while a confirmation was sent within the cooldown (retried request)", () => {
    expect(decideSubscriptionRequest(pending(), later(CONFIRMATION_RESEND_COOLDOWN_MS - 1))).toBe(
      "confirmation_recently_sent",
    );
  });

  it("resends once the cooldown has passed", () => {
    expect(decideSubscriptionRequest(pending(), later(CONFIRMATION_RESEND_COOLDOWN_MS))).toBe(
      "send_confirmation",
    );
  });

  it("resends when the previous confirmation email was never delivered", () => {
    expect(decideSubscriptionRequest(markConfirmationUnsent(pending()), later(1))).toBe(
      "send_confirmation",
    );
  });

  it("starts over after an unsubscribe", () => {
    expect(decideSubscriptionRequest(unsubscribe(subscribed(), later(2000)), later(3000))).toBe(
      "send_confirmation",
    );
  });
});

describe("startPendingSubscription", () => {
  it("records a pending request with the consent context but no confirmed consent yet", () => {
    const subscription = pending();

    expect(subscription).toMatchObject({
      userId: "user-1",
      status: "pending",
      unsubscribeKey: "key-1",
      consentVersion: NEWSLETTER_CONSENT_VERSION,
      consentSource: "settings",
      requestedAt: NOW,
      confirmedAt: null,
      unsubscribedAt: null,
      confirmationTokenHash: "hash-1",
      confirmationSentAt: NOW,
    });
    expect(subscription.confirmationExpiresAt).toEqual(later(CONFIRMATION_TOKEN_TTL_MS));
  });

  it("keeps the existing unsubscribe key, so links in older emails keep working", () => {
    const again = startPendingSubscription(unsubscribe(subscribed(), later(2000)), {
      userId: "user-1",
      unsubscribeKey: "a-new-key-that-must-be-ignored",
      confirmationTokenHash: "hash-2",
      consentSource: "settings",
      now: later(3000),
    });

    expect(again.unsubscribeKey).toBe("key-1");
    expect(again.status).toBe("pending");
    expect(again.confirmedAt).toBeNull();
    expect(again.unsubscribedAt).toBeNull();
    expect(again.confirmationTokenHash).toBe("hash-2");
  });

  it("refuses to downgrade a confirmed subscription", () => {
    expect(() =>
      startPendingSubscription(subscribed(), {
        userId: "user-1",
        unsubscribeKey: "key-1",
        confirmationTokenHash: "hash-2",
        consentSource: "settings",
        now: later(5000),
      }),
    ).toThrow(/already subscribed/);
  });
});

describe("confirmSubscription", () => {
  it("confirms a pending subscription and consumes the token", () => {
    const confirmed = subscribed();

    expect(confirmed.status).toBe("subscribed");
    expect(confirmed.confirmedAt).toEqual(later(1000));
    expect(confirmed.confirmationTokenHash).toBeNull();
    expect(confirmed.confirmationExpiresAt).toBeNull();
  });

  it("rejects a token that does not match the pending one", () => {
    expect(() => confirmSubscription(pending(), "other-hash", later(1000))).toThrow(
      InvalidNewsletterTokenError,
    );
  });

  it("rejects a second use of the same token (single use)", () => {
    expect(() => confirmSubscription(subscribed(), "hash-1", later(2000))).toThrow(
      InvalidNewsletterTokenError,
    );
  });

  it("rejects an expired token, exactly at the expiry instant", () => {
    expect(() =>
      confirmSubscription(pending(), "hash-1", later(CONFIRMATION_TOKEN_TTL_MS)),
    ).toThrow(NewsletterTokenExpiredError);
  });

  it("rejects confirming after an unsubscribe cancelled the pending request", () => {
    const cancelled = unsubscribe(pending(), later(10));
    expect(() => confirmSubscription(cancelled, "hash-1", later(20))).toThrow(
      InvalidNewsletterTokenError,
    );
  });
});

describe("unsubscribe", () => {
  it("withdraws a confirmed subscription", () => {
    const withdrawn = unsubscribe(subscribed(), later(2000));

    expect(withdrawn.status).toBe("unsubscribed");
    expect(withdrawn.unsubscribedAt).toEqual(later(2000));
    expect(canReceiveMarketing(withdrawn)).toBe(false);
  });

  it("cancels a pending request and invalidates its confirmation token", () => {
    const cancelled = unsubscribe(pending(), later(10));

    expect(cancelled.status).toBe("unsubscribed");
    expect(cancelled.confirmationTokenHash).toBeNull();
    expect(cancelled.confirmationExpiresAt).toBeNull();
  });

  it("is idempotent: a second unsubscribe changes nothing, not even the timestamp", () => {
    const once = unsubscribe(subscribed(), later(2000));
    const twice = unsubscribe(once, later(9000));

    expect(twice).toBe(once);
  });
});

describe("marketing consent", () => {
  it("only a confirmed subscription may receive marketing", () => {
    expect(canReceiveMarketing(null)).toBe(false);
    expect(canReceiveMarketing(pending())).toBe(false);
    expect(canReceiveMarketing(subscribed())).toBe(true);
  });

  it("builds a marketing recipient only from a confirmed subscription", () => {
    const recipient = toMarketingRecipient(subscribed(), "ada@example.com");

    expect(recipient).toEqual({ email: "ada@example.com", unsubscribeKey: "key-1" });
  });

  it("refuses to build a marketing recipient without consent", () => {
    expect(() => toMarketingRecipient(pending(), "ada@example.com")).toThrow(
      MarketingConsentRequiredError,
    );
    expect(() =>
      toMarketingRecipient(unsubscribe(subscribed(), later(2000)), "ada@example.com"),
    ).toThrow(MarketingConsentRequiredError);
  });
});

describe("newsletterPreferenceOf", () => {
  it("maps each state to what the settings page shows", () => {
    expect(newsletterPreferenceOf(null)).toEqual({ status: "not_subscribed", since: null });
    expect(newsletterPreferenceOf(pending())).toEqual({ status: "pending", since: NOW });
    expect(newsletterPreferenceOf(subscribed())).toEqual({
      status: "subscribed",
      since: later(1000),
    });
    expect(newsletterPreferenceOf(unsubscribe(subscribed(), later(2000)))).toEqual({
      status: "not_subscribed",
      since: later(2000),
    });
  });
});
