import { confirmSubscription, startPendingSubscription, unsubscribe } from "@tfm-bic/domain";
import { describe, expect, it } from "vitest";

import { ProviderMarketingEmailSender } from "../../email/email-senders.js";
import {
  FakeUnsubscribeTokenCodec,
  RecordingEmailProvider,
} from "../../email/test-support/fakes.js";
import { EmailTemplateError } from "../../email/templates/email-template.error.js";
import { InMemoryNewsletterSubscriptionRepository } from "../test-support/fakes.js";
import { SendNewsletterIssueUseCase } from "./send-newsletter-issue.use-case.js";

const NOW = new Date("2026-09-26T10:00:00.000Z");
const ISSUE = { subject: "News", title: "What is new", paragraphs: ["Hello."] };

function seed(
  repository: InMemoryNewsletterSubscriptionRepository,
  userId: string,
  state: "pending" | "subscribed" | "unsubscribed",
): void {
  const pending = startPendingSubscription(null, {
    userId,
    unsubscribeKey: `key-${userId}`,
    confirmationTokenHash: `hash-${userId}`,
    consentSource: "settings",
    now: NOW,
  });
  const subscribed = confirmSubscription(pending, `hash-${userId}`, NOW);
  const record =
    state === "pending"
      ? pending
      : state === "subscribed"
        ? subscribed
        : unsubscribe(subscribed, NOW);
  repository.records.set(userId, record);
  repository.emails.set(userId, `${userId}@example.com`);
}

function build() {
  const repository = new InMemoryNewsletterSubscriptionRepository();
  const provider = new RecordingEmailProvider();
  const sender = new ProviderMarketingEmailSender(
    provider,
    {
      from: "TFM-BIC <news@example.com>",
      replyTo: null,
      appBaseUrl: "https://app.example.com",
      locale: "en",
    },
    new FakeUnsubscribeTokenCodec(),
  );
  return { repository, provider, useCase: new SendNewsletterIssueUseCase(repository, sender) };
}

describe("SendNewsletterIssueUseCase", () => {
  it("sends only to confirmed subscriptions — never pending or unsubscribed ones", async () => {
    const { repository, provider, useCase } = build();
    seed(repository, "a", "subscribed");
    seed(repository, "b", "pending");
    seed(repository, "c", "unsubscribed");
    seed(repository, "d", "subscribed");

    const result = await useCase.execute(ISSUE);

    expect(result).toEqual({ recipients: 2, accepted: 2, failed: 0 });
    expect(provider.sent.map((m) => m.to).sort()).toEqual(["a@example.com", "d@example.com"]);
    expect(provider.sent.every((m) => m.category === "marketing")).toBe(true);
    expect(provider.sent.every((m) => m.listUnsubscribeUrl !== null)).toBe(true);
  });

  it("gives each recipient their own unsubscribe link", async () => {
    const { repository, provider, useCase } = build();
    seed(repository, "a", "subscribed");
    seed(repository, "d", "subscribed");

    await useCase.execute(ISSUE);

    const byRecipient = new Map(provider.sent.map((m) => [m.to, m.listUnsubscribeUrl]));
    expect(byRecipient.get("a@example.com")).toContain("signed.key-a");
    expect(byRecipient.get("d@example.com")).toContain("signed.key-d");
  });

  it("keeps going when one delivery fails, and counts it", async () => {
    const { repository, provider, useCase } = build();
    seed(repository, "a", "subscribed");
    seed(repository, "d", "subscribed");
    provider.failNext();

    await expect(useCase.execute(ISSUE)).resolves.toEqual({
      recipients: 2,
      accepted: 1,
      failed: 1,
    });
  });

  it("validates the content before sending anything", async () => {
    const { repository, provider, useCase } = build();
    seed(repository, "a", "subscribed");

    await expect(useCase.execute({ ...ISSUE, paragraphs: [] })).rejects.toBeInstanceOf(
      EmailTemplateError,
    );
    expect(provider.sent).toHaveLength(0);
  });

  it("does nothing when nobody is subscribed", async () => {
    const { useCase } = build();

    await expect(useCase.execute(ISSUE)).resolves.toEqual({
      recipients: 0,
      accepted: 0,
      failed: 0,
    });
  });
});
