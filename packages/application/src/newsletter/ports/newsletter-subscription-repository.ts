import type { NewsletterSubscription } from "@tfm-bic/domain";

/** A confirmed subscription and the account's current email address. */
export interface SubscribedRecipient {
  readonly subscription: NewsletterSubscription;
  readonly email: string;
}

/**
 * Newsletter consent records (M14) — one per user at most. The email address is never copied into
 * this record: marketing goes to the account's current address, read at send time.
 */
export interface NewsletterSubscriptionRepository {
  findByUserId(userId: string): Promise<NewsletterSubscription | null>;
  findByConfirmationTokenHash(tokenHash: string): Promise<NewsletterSubscription | null>;
  findByUnsubscribeKey(unsubscribeKey: string): Promise<NewsletterSubscription | null>;
  /** Inserts or replaces the user's record. */
  save(subscription: NewsletterSubscription): Promise<void>;
  /** Every `subscribed` record with its account's email address. */
  listSubscribed(): Promise<SubscribedRecipient[]>;
}
