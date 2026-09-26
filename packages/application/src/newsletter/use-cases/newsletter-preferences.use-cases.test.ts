import {
  CONFIRMATION_RESEND_COOLDOWN_MS,
  CONFIRMATION_TOKEN_TTL_MS,
  InvalidNewsletterTokenError,
  NEWSLETTER_CONSENT_VERSION,
  NewsletterTokenExpiredError,
} from "@tfm-bic/domain";
import { describe, expect, it } from "vitest";

import { EmailDeliveryError } from "../../email/email-delivery.error.js";
import { ProviderTransactionalEmailSender } from "../../email/email-senders.js";
import {
  FakeUnsubscribeTokenCodec,
  RecordingEmailProvider,
} from "../../email/test-support/fakes.js";
import { FakeTokenGenerator, FixedClock } from "../../identity/test-support/fakes.js";
import { NewsletterConsentVersionMismatchError } from "../newsletter-consent-version-mismatch.error.js";
import { InMemoryNewsletterSubscriptionRepository } from "../test-support/fakes.js";
import {
  ConfirmNewsletterSubscriptionUseCase,
  GetEmailPreferencesUseCase,
  RequestNewsletterSubscriptionUseCase,
  UnsubscribeFromNewsletterUseCase,
  UnsubscribeWithTokenUseCase,
} from "./newsletter-preferences.use-cases.js";

const APP = "https://app.example.com";
const USER = { id: "user-1", email: "ada@example.com" };

function build() {
  const clock = new FixedClock(new Date("2026-09-26T10:00:00.000Z"));
  const repository = new InMemoryNewsletterSubscriptionRepository();
  const tokens = new FakeTokenGenerator();
  const provider = new RecordingEmailProvider();
  const sender = new ProviderTransactionalEmailSender(provider, {
    from: "TFM-BIC <no-reply@example.com>",
    replyTo: null,
    appBaseUrl: APP,
    locale: "en",
  });
  const codec = new FakeUnsubscribeTokenCodec();
  return {
    clock,
    repository,
    tokens,
    provider,
    codec,
    getPreferences: new GetEmailPreferencesUseCase(repository),
    request: new RequestNewsletterSubscriptionUseCase(repository, tokens, sender, clock, APP),
    confirm: new ConfirmNewsletterSubscriptionUseCase(repository, tokens, clock),
    unsubscribe: new UnsubscribeFromNewsletterUseCase(repository, clock),
    unsubscribeWithToken: new UnsubscribeWithTokenUseCase(repository, codec, clock),
  };
}

type Harness = ReturnType<typeof build>;

async function subscribe(harness: Harness): Promise<void> {
  harness.tokens.enqueue("unsubscribe-key");
  harness.tokens.enqueue("confirm-token");
  await harness.request.execute({ user: USER, consentVersion: NEWSLETTER_CONSENT_VERSION });
  await harness.confirm.execute({ token: "confirm-token" });
}

describe("GetEmailPreferencesUseCase", () => {
  it("reports essential email as always on and the newsletter as not subscribed by default", async () => {
    const { getPreferences } = build();

    await expect(getPreferences.execute({ userId: USER.id })).resolves.toEqual({
      essential: { enabled: true, required: true },
      newsletter: { status: "not_subscribed", since: null },
    });
  });

  it("reports a confirmed subscription", async () => {
    const harness = build();
    await subscribe(harness);

    const preferences = await harness.getPreferences.execute({ userId: USER.id });

    expect(preferences.newsletter.status).toBe("subscribed");
    expect(preferences.essential).toEqual({ enabled: true, required: true });
  });
});

describe("RequestNewsletterSubscriptionUseCase", () => {
  it("creates a pending request and emails a confirmation link (transactional)", async () => {
    const { request, repository, tokens, provider, clock } = build();
    tokens.enqueue("unsubscribe-key");
    tokens.enqueue("confirm-token");

    const result = await request.execute({
      user: USER,
      consentVersion: NEWSLETTER_CONSENT_VERSION,
    });

    expect(result).toEqual({
      newsletter: { status: "pending", since: clock.now() },
      confirmationEmailSent: true,
    });
    const record = repository.records.get(USER.id)!;
    expect(record).toMatchObject({
      status: "pending",
      unsubscribeKey: "unsubscribe-key",
      confirmationTokenHash: "hashed:confirm-token",
      consentSource: "settings",
      consentVersion: NEWSLETTER_CONSENT_VERSION,
    });
    expect(provider.sent).toHaveLength(1);
    expect(provider.sent[0]).toMatchObject({
      to: USER.email,
      category: "transactional",
      template: "newsletter-confirmation",
    });
    expect(provider.sent[0]!.text).toContain(`${APP}/newsletter/confirm?token=confirm-token`);
  });

  it("never stores the raw confirmation token", async () => {
    const { request, repository, tokens } = build();
    tokens.enqueue("unsubscribe-key");
    tokens.enqueue("confirm-token");

    await request.execute({ user: USER, consentVersion: NEWSLETTER_CONSENT_VERSION });

    expect(JSON.stringify([...repository.records.values()])).not.toContain('"confirm-token"');
  });

  it("refuses a consent given for another version of the consent text", async () => {
    const { request, repository, provider } = build();

    await expect(
      request.execute({ user: USER, consentVersion: "an-old-version" }),
    ).rejects.toBeInstanceOf(NewsletterConsentVersionMismatchError);
    expect(repository.records.size).toBe(0);
    expect(provider.sent).toHaveLength(0);
  });

  it("does not send a second email for a repeated request within the cooldown", async () => {
    const { request, provider, clock } = build();
    await request.execute({ user: USER, consentVersion: NEWSLETTER_CONSENT_VERSION });
    clock.advance(CONFIRMATION_RESEND_COOLDOWN_MS - 1);

    const again = await request.execute({ user: USER, consentVersion: NEWSLETTER_CONSENT_VERSION });

    expect(again.newsletter.status).toBe("pending");
    expect(again.confirmationEmailSent).toBe(false);
    expect(provider.sent).toHaveLength(1);
  });

  it("sends a fresh link after the cooldown and invalidates the previous one", async () => {
    const harness = build();
    harness.tokens.enqueue("key");
    harness.tokens.enqueue("first-token");
    await harness.request.execute({ user: USER, consentVersion: NEWSLETTER_CONSENT_VERSION });
    harness.clock.advance(CONFIRMATION_RESEND_COOLDOWN_MS);
    harness.tokens.enqueue("key-ignored");
    harness.tokens.enqueue("second-token");

    await harness.request.execute({ user: USER, consentVersion: NEWSLETTER_CONSENT_VERSION });

    expect(harness.provider.sent).toHaveLength(2);
    await expect(harness.confirm.execute({ token: "first-token" })).rejects.toBeInstanceOf(
      InvalidNewsletterTokenError,
    );
    await harness.confirm.execute({ token: "second-token" });
    expect(harness.repository.records.get(USER.id)!.unsubscribeKey).toBe("key");
  });

  it("is a no-op for an already confirmed subscription (duplicate subscription)", async () => {
    const harness = build();
    await subscribe(harness);
    const sentBefore = harness.provider.sent.length;

    const result = await harness.request.execute({
      user: USER,
      consentVersion: NEWSLETTER_CONSENT_VERSION,
    });

    expect(result.newsletter.status).toBe("subscribed");
    expect(result.confirmationEmailSent).toBe(false);
    expect(harness.provider.sent).toHaveLength(sentBefore);
  });

  it("keeps the request pending and lets the user retry at once when the provider fails", async () => {
    const { request, repository, provider } = build();
    provider.failNext();

    await expect(
      request.execute({ user: USER, consentVersion: NEWSLETTER_CONSENT_VERSION }),
    ).rejects.toBeInstanceOf(EmailDeliveryError);
    expect(repository.records.get(USER.id)).toMatchObject({
      status: "pending",
      confirmationSentAt: null,
    });

    const retry = await request.execute({ user: USER, consentVersion: NEWSLETTER_CONSENT_VERSION });
    expect(retry.confirmationEmailSent).toBe(true);
    expect(provider.sent).toHaveLength(1);
  });
});

describe("ConfirmNewsletterSubscriptionUseCase", () => {
  it("confirms the subscription with a valid token", async () => {
    const harness = build();
    await subscribe(harness);

    expect(harness.repository.records.get(USER.id)).toMatchObject({
      status: "subscribed",
      confirmedAt: harness.clock.now(),
      confirmationTokenHash: null,
    });
  });

  it("rejects an unknown token", async () => {
    const { confirm } = build();

    await expect(confirm.execute({ token: "nope" })).rejects.toBeInstanceOf(
      InvalidNewsletterTokenError,
    );
  });

  it("rejects a token used twice (single use)", async () => {
    const harness = build();
    await subscribe(harness);

    await expect(harness.confirm.execute({ token: "confirm-token" })).rejects.toBeInstanceOf(
      InvalidNewsletterTokenError,
    );
  });

  it("rejects an expired token and leaves the request pending", async () => {
    const harness = build();
    harness.tokens.enqueue("key");
    harness.tokens.enqueue("confirm-token");
    await harness.request.execute({ user: USER, consentVersion: NEWSLETTER_CONSENT_VERSION });
    harness.clock.advance(CONFIRMATION_TOKEN_TTL_MS);

    await expect(harness.confirm.execute({ token: "confirm-token" })).rejects.toBeInstanceOf(
      NewsletterTokenExpiredError,
    );
    expect(harness.repository.records.get(USER.id)!.status).toBe("pending");
  });
});

describe("UnsubscribeFromNewsletterUseCase (signed-in settings)", () => {
  it("withdraws a confirmed subscription", async () => {
    const harness = build();
    await subscribe(harness);

    const result = await harness.unsubscribe.execute({ userId: USER.id });

    expect(result).toEqual({ status: "not_subscribed", since: harness.clock.now() });
    expect(harness.repository.records.get(USER.id)!.status).toBe("unsubscribed");
  });

  it("is idempotent: unsubscribing twice writes nothing the second time", async () => {
    const harness = build();
    await subscribe(harness);
    await harness.unsubscribe.execute({ userId: USER.id });
    const savesAfterFirst = harness.repository.saves;

    const again = await harness.unsubscribe.execute({ userId: USER.id });

    expect(again.status).toBe("not_subscribed");
    expect(harness.repository.saves).toBe(savesAfterFirst);
  });

  it("succeeds for someone who never subscribed, without creating a record", async () => {
    const { unsubscribe, repository } = build();

    await expect(unsubscribe.execute({ userId: USER.id })).resolves.toEqual({
      status: "not_subscribed",
      since: null,
    });
    expect(repository.records.size).toBe(0);
  });
});

describe("UnsubscribeWithTokenUseCase (link in a newsletter, no login)", () => {
  it("withdraws the subscription the signed token identifies", async () => {
    const harness = build();
    await subscribe(harness);

    await harness.unsubscribeWithToken.execute({ token: "signed.unsubscribe-key" });

    expect(harness.repository.records.get(USER.id)!.status).toBe("unsubscribed");
  });

  it("is idempotent for the same link", async () => {
    const harness = build();
    await subscribe(harness);
    await harness.unsubscribeWithToken.execute({ token: "signed.unsubscribe-key" });

    await expect(
      harness.unsubscribeWithToken.execute({ token: "signed.unsubscribe-key" }),
    ).resolves.toEqual({ status: "not_subscribed" });
  });

  it("rejects a forged or malformed token without touching any record", async () => {
    const harness = build();
    await subscribe(harness);

    await expect(
      harness.unsubscribeWithToken.execute({ token: "unsubscribe-key" }),
    ).rejects.toBeInstanceOf(InvalidNewsletterTokenError);
    expect(harness.repository.records.get(USER.id)!.status).toBe("subscribed");
  });

  it("succeeds quietly when the record no longer exists (e.g. the account was deleted)", async () => {
    const { unsubscribeWithToken } = build();

    await expect(unsubscribeWithToken.execute({ token: "signed.gone" })).resolves.toEqual({
      status: "not_subscribed",
    });
  });
});
