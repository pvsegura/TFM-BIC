import { sql } from "drizzle-orm";
import { check, index, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

import { users } from "../../identity/db/schema.js";

/**
 * Newsletter consent (M14, ADR-025): at most one row per user, created only when the user asks to
 * subscribe — never by registration. It stores consent state and its minimal metadata (consent
 * text version, source, timestamps), never an email address (the account's current address is
 * read at send time), an IP address or provider payloads.
 *
 * - `ON DELETE CASCADE`: deleting the account deletes the consent record, so no marketing can
 *   continue after an account is gone.
 * - `unsubscribe_key` is random and unique; signed links identify it instead of the user id.
 * - `confirmation_token_hash` is the SHA-256 of the pending double opt-in token (never the token).
 * - The CHECKs mirror the domain's state rules, so no write path can store an impossible state.
 */
export const newsletterSubscriptions = pgTable(
  "newsletter_subscriptions",
  {
    userId: uuid("user_id")
      .primaryKey()
      .references(() => users.id, { onDelete: "cascade" }),
    status: text("status").notNull(),
    unsubscribeKey: text("unsubscribe_key").notNull(),
    consentVersion: text("consent_version").notNull(),
    consentSource: text("consent_source").notNull(),
    requestedAt: timestamp("requested_at", { withTimezone: true }).notNull(),
    confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
    unsubscribedAt: timestamp("unsubscribed_at", { withTimezone: true }),
    confirmationTokenHash: text("confirmation_token_hash"),
    confirmationExpiresAt: timestamp("confirmation_expires_at", { withTimezone: true }),
    confirmationSentAt: timestamp("confirmation_sent_at", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    uniqueIndex("newsletter_subscriptions_unsubscribe_key_key").on(table.unsubscribeKey),
    uniqueIndex("newsletter_subscriptions_confirmation_token_hash_key").on(
      table.confirmationTokenHash,
    ),
    index("newsletter_subscriptions_subscribed_idx")
      .on(table.userId)
      .where(sql`${table.status} = 'subscribed'`),
    check(
      "newsletter_subscriptions_status",
      sql`${table.status} IN ('pending', 'subscribed', 'unsubscribed')`,
    ),
    check("newsletter_subscriptions_consent_source", sql`${table.consentSource} IN ('settings')`),
    check(
      "newsletter_subscriptions_subscribed_confirmed",
      sql`${table.status} <> 'subscribed' OR ${table.confirmedAt} IS NOT NULL`,
    ),
    check(
      "newsletter_subscriptions_unsubscribed_dated",
      sql`${table.status} <> 'unsubscribed' OR ${table.unsubscribedAt} IS NOT NULL`,
    ),
    check(
      "newsletter_subscriptions_token_has_expiry",
      sql`(${table.confirmationTokenHash} IS NULL) = (${table.confirmationExpiresAt} IS NULL)`,
    ),
    check(
      "newsletter_subscriptions_token_only_pending",
      sql`${table.confirmationTokenHash} IS NULL OR ${table.status} = 'pending'`,
    ),
  ],
);
