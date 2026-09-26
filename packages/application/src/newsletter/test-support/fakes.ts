import type { NewsletterSubscription } from "@tfm-bic/domain";

import type {
  NewsletterSubscriptionRepository,
  SubscribedRecipient,
} from "../ports/newsletter-subscription-repository.js";

/** In-memory newsletter repository for use-case tests. Not exported from the package index. */
export class InMemoryNewsletterSubscriptionRepository implements NewsletterSubscriptionRepository {
  readonly records = new Map<string, NewsletterSubscription>();
  /** userId → email, standing in for the `users` table the real repository joins. */
  readonly emails = new Map<string, string>();
  saves = 0;

  findByUserId(userId: string): Promise<NewsletterSubscription | null> {
    return Promise.resolve(this.records.get(userId) ?? null);
  }

  findByConfirmationTokenHash(tokenHash: string): Promise<NewsletterSubscription | null> {
    return Promise.resolve(
      [...this.records.values()].find((r) => r.confirmationTokenHash === tokenHash) ?? null,
    );
  }

  findByUnsubscribeKey(unsubscribeKey: string): Promise<NewsletterSubscription | null> {
    return Promise.resolve(
      [...this.records.values()].find((r) => r.unsubscribeKey === unsubscribeKey) ?? null,
    );
  }

  save(subscription: NewsletterSubscription): Promise<void> {
    this.saves += 1;
    this.records.set(subscription.userId, subscription);
    return Promise.resolve();
  }

  listSubscribed(): Promise<SubscribedRecipient[]> {
    return Promise.resolve(
      [...this.records.values()]
        .filter((subscription) => subscription.status === "subscribed")
        .map((subscription) => ({
          subscription,
          email: this.emails.get(subscription.userId) ?? `${subscription.userId}@example.com`,
        })),
    );
  }
}
