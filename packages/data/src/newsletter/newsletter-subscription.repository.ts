import type { NewsletterSubscriptionRepository, SubscribedRecipient } from "@tfm-bic/application";
import type {
  NewsletterConsentSource,
  NewsletterStatus,
  NewsletterSubscription,
} from "@tfm-bic/domain";
import { eq } from "drizzle-orm";

import { users } from "../identity/db/schema.js";
import type { NewsletterDb } from "./db/client.js";
import { newsletterSubscriptions } from "./db/schema.js";

type Row = typeof newsletterSubscriptions.$inferSelect;

/** The CHECK constraints guarantee these values; the casts only narrow `text` for TypeScript. */
function toSubscription(row: Row): NewsletterSubscription {
  return {
    userId: row.userId,
    status: row.status as NewsletterStatus,
    unsubscribeKey: row.unsubscribeKey,
    consentVersion: row.consentVersion,
    consentSource: row.consentSource as NewsletterConsentSource,
    requestedAt: row.requestedAt,
    confirmedAt: row.confirmedAt,
    unsubscribedAt: row.unsubscribedAt,
    confirmationTokenHash: row.confirmationTokenHash,
    confirmationExpiresAt: row.confirmationExpiresAt,
    confirmationSentAt: row.confirmationSentAt,
  };
}

export class DrizzleNewsletterSubscriptionRepository implements NewsletterSubscriptionRepository {
  constructor(private readonly db: NewsletterDb) {}

  findByUserId(userId: string): Promise<NewsletterSubscription | null> {
    return this.findOne(eq(newsletterSubscriptions.userId, userId));
  }

  findByConfirmationTokenHash(tokenHash: string): Promise<NewsletterSubscription | null> {
    return this.findOne(eq(newsletterSubscriptions.confirmationTokenHash, tokenHash));
  }

  findByUnsubscribeKey(unsubscribeKey: string): Promise<NewsletterSubscription | null> {
    return this.findOne(eq(newsletterSubscriptions.unsubscribeKey, unsubscribeKey));
  }

  async save(subscription: NewsletterSubscription): Promise<void> {
    const { userId, ...fields } = subscription;
    const values = { ...fields, updatedAt: new Date() };
    await this.db
      .insert(newsletterSubscriptions)
      .values({ userId, ...values })
      .onConflictDoUpdate({ target: newsletterSubscriptions.userId, set: values });
  }

  async listSubscribed(): Promise<SubscribedRecipient[]> {
    const rows = await this.db
      .select({ subscription: newsletterSubscriptions, email: users.email })
      .from(newsletterSubscriptions)
      .innerJoin(users, eq(users.id, newsletterSubscriptions.userId))
      .where(eq(newsletterSubscriptions.status, "subscribed"))
      .orderBy(newsletterSubscriptions.userId);
    return rows.map((row) => ({
      subscription: toSubscription(row.subscription),
      email: row.email,
    }));
  }

  private async findOne(condition: ReturnType<typeof eq>): Promise<NewsletterSubscription | null> {
    const [row] = await this.db.select().from(newsletterSubscriptions).where(condition).limit(1);
    return row ? toSubscription(row) : null;
  }
}
