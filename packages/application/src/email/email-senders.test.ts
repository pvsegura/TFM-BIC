import {
  confirmSubscription,
  startPendingSubscription,
  toMarketingRecipient,
  type MarketingRecipient,
} from "@tfm-bic/domain";
import { describe, expect, it } from "vitest";

import { EmailDeliveryError } from "./email-delivery.error.js";
import {
  ProviderMarketingEmailSender,
  ProviderTransactionalEmailSender,
  type EmailSenderConfig,
} from "./email-senders.js";
import { EmailTemplateError } from "./templates/email-template.error.js";
import {
  FakeUnsubscribeTokenCodec,
  RecordingDeliveryObserver,
  RecordingEmailProvider,
} from "./test-support/fakes.js";

const CONFIG: EmailSenderConfig = {
  from: "TFM-BIC <no-reply@example.com>",
  replyTo: "support@example.com",
  appBaseUrl: "https://app.example.com",
  locale: "en",
};

function consentedRecipient(email = "ada@example.com"): MarketingRecipient {
  const now = new Date("2026-09-26T10:00:00.000Z");
  const pending = startPendingSubscription(null, {
    userId: "user-1",
    unsubscribeKey: "key-1",
    confirmationTokenHash: "hash",
    consentSource: "settings",
    now,
  });
  return toMarketingRecipient(confirmSubscription(pending, "hash", now), email);
}

describe("ProviderTransactionalEmailSender", () => {
  function build() {
    const provider = new RecordingEmailProvider();
    const observer = new RecordingDeliveryObserver();
    const sender = new ProviderTransactionalEmailSender(provider, CONFIG, observer);
    return { provider, observer, sender };
  }

  it("renders the template and hands a transactional message to the provider", async () => {
    const { provider, sender } = build();

    await sender.send("ada@example.com", {
      template: "password-reset",
      variables: { resetUrl: "https://app.example.com/reset-password?token=t1" },
    });

    expect(provider.sent).toHaveLength(1);
    expect(provider.sent[0]).toMatchObject({
      to: "ada@example.com",
      from: CONFIG.from,
      replyTo: CONFIG.replyTo,
      subject: "Reset your password",
      category: "transactional",
      template: "password-reset",
      listUnsubscribeUrl: null,
    });
    expect(provider.sent[0]!.text).toContain("https://app.example.com/reset-password?token=t1");
  });

  it("records an accepted delivery without the recipient or the link", async () => {
    const { observer, sender } = build();

    await sender.send("ada@example.com", {
      template: "email-verification",
      variables: { verificationUrl: "https://app.example.com/verify-email?token=secret" },
    });

    expect(observer.events).toEqual([
      {
        category: "transactional",
        template: "email-verification",
        provider: "recording",
        outcome: "accepted",
      },
    ]);
    expect(JSON.stringify(observer.events)).not.toContain("secret");
    expect(JSON.stringify(observer.events)).not.toContain("ada@");
  });

  it("wraps a provider failure in EmailDeliveryError and records it", async () => {
    const { provider, observer, sender } = build();
    provider.failNext();

    await expect(
      sender.send("ada@example.com", {
        template: "email-verification",
        variables: { verificationUrl: "https://app.example.com/verify-email?token=x" },
      }),
    ).rejects.toBeInstanceOf(EmailDeliveryError);
    expect(observer.events[0]!.outcome).toBe("failed");
  });

  it("records the provider's safe failure reason, so a rejection can be diagnosed from the logs", async () => {
    const { provider, observer, sender } = build();
    provider.send = () =>
      Promise.reject(new EmailDeliveryError({ reason: "http_403:validation_error" }));

    await expect(
      sender.send("ada@example.com", {
        template: "email-verification",
        variables: { verificationUrl: "https://app.example.com/verify-email?token=x" },
      }),
    ).rejects.toBeInstanceOf(EmailDeliveryError);
    expect(observer.events[0]).toMatchObject({
      outcome: "failed",
      reason: "http_403:validation_error",
    });
  });

  it("does not call the provider when a template variable is invalid", async () => {
    const { provider, sender } = build();

    await expect(
      sender.send("ada@example.com", {
        template: "password-reset",
        variables: { resetUrl: "https://evil.example.net/reset" },
      }),
    ).rejects.toBeInstanceOf(EmailTemplateError);
    expect(provider.sent).toHaveLength(0);
  });

  it("works without an observer and without a reply-to address", async () => {
    const provider = new RecordingEmailProvider();
    const sender = new ProviderTransactionalEmailSender(provider, { ...CONFIG, replyTo: null });

    await sender.send("ada@example.com", {
      template: "newsletter-confirmation",
      variables: { confirmationUrl: "https://app.example.com/newsletter/confirm?token=c" },
    });

    expect(provider.sent[0]!.replyTo).toBeNull();
  });
});

describe("ProviderMarketingEmailSender", () => {
  function build() {
    const provider = new RecordingEmailProvider();
    const observer = new RecordingDeliveryObserver();
    const sender = new ProviderMarketingEmailSender(
      provider,
      CONFIG,
      new FakeUnsubscribeTokenCodec(),
      observer,
    );
    return { provider, observer, sender };
  }

  const ISSUE = { subject: "September news", title: "New lessons", paragraphs: ["Hello."] };

  it("sends a marketing message with a signed unsubscribe link and one-click header URL", async () => {
    const { provider, sender } = build();

    await sender.send(consentedRecipient(), ISSUE);

    const message = provider.sent[0]!;
    expect(message).toMatchObject({
      to: "ada@example.com",
      category: "marketing",
      template: "newsletter-issue",
      subject: "September news",
      listUnsubscribeUrl:
        "https://app.example.com/email-preferences/newsletter/unsubscribe?token=signed.key-1",
    });
    expect(message.text).toContain(
      "Unsubscribe: https://app.example.com/newsletter/unsubscribe?token=signed.key-1",
    );
  });

  it("never puts the user id in the unsubscribe link", async () => {
    const { provider, sender } = build();

    await sender.send(consentedRecipient(), ISSUE);

    expect(provider.sent[0]!.text).not.toContain("user-1");
    expect(provider.sent[0]!.listUnsubscribeUrl).not.toContain("user-1");
  });

  it("wraps a provider failure in EmailDeliveryError and records it as marketing", async () => {
    const { provider, observer, sender } = build();
    provider.failNext();

    await expect(sender.send(consentedRecipient(), ISSUE)).rejects.toBeInstanceOf(
      EmailDeliveryError,
    );
    expect(observer.events).toEqual([
      {
        category: "marketing",
        template: "newsletter-issue",
        provider: "recording",
        outcome: "failed",
      },
    ]);
  });
});
