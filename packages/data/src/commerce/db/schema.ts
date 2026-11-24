import {
  LICENCE_KINDS,
  LICENCE_SOURCES,
  PRODUCT_BILLING,
  PRODUCT_STATUSES,
  PURCHASE_STATUSES,
  SUBSCRIPTION_STATUSES,
} from "@verbysia/domain";
import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { users } from "../../identity/db/schema.js";

const inList = (values: readonly string[]) => sql.raw(values.map((v) => `'${v}'`).join(", "));

/**
 * What Verbysia sells. Prices are integers in the currency's minor unit (grosze for PLN) so no
 * rounding ever happens in the database. `status = 'draft'` products (A2–B2 until their content
 * exists) are never offered for sale. `provider_price_id` is the payment provider's id for this
 * price — empty until a provider is configured; checkout refuses a product without one.
 */
export const products = pgTable(
  "products",
  {
    id: text("id").primaryKey(),
    licenceKind: text("licence_kind", { enum: LICENCE_KINDS }).notNull(),
    billing: text("billing", { enum: PRODUCT_BILLING }).notNull(),
    status: text("status", { enum: PRODUCT_STATUSES }).notNull(),
    namePl: text("name_pl").notNull(),
    descriptionPl: text("description_pl").notNull(),
    priceMinor: integer("price_minor").notNull(),
    currency: text("currency").notNull(),
    /** Licence length for one-off products; null = indefinite. Subscriptions use the period. */
    accessDays: integer("access_days"),
    providerPriceId: text("provider_price_id"),
    sortOrder: integer("sort_order").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (t) => [
    check("products_id_valid", sql`${t.id} ~ '^[a-z][a-z0-9]*(-[a-z0-9]+)*$'`),
    check("products_licence_kind_valid", sql`${t.licenceKind} IN (${inList(LICENCE_KINDS)})`),
    check("products_billing_valid", sql`${t.billing} IN (${inList(PRODUCT_BILLING)})`),
    check("products_status_valid", sql`${t.status} IN (${inList(PRODUCT_STATUSES)})`),
    check("products_price_non_negative", sql`${t.priceMinor} >= 0`),
    check("products_currency_valid", sql`${t.currency} ~ '^[A-Z]{3}$'`),
    check("products_access_days_positive", sql`${t.accessDays} IS NULL OR ${t.accessDays} > 0`),
  ],
);

/**
 * One purchase attempt and its outcome. `provider_ref` (the provider's checkout/payment id) is
 * unique, so a retried webhook can never record the same payment twice. `amount_minor` is the
 * amount actually charged, copied at purchase time — a later price change never rewrites history.
 */
export const purchases = pgTable(
  "purchases",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    productId: text("product_id")
      .notNull()
      .references(() => products.id),
    status: text("status", { enum: PURCHASE_STATUSES }).notNull(),
    amountMinor: integer("amount_minor").notNull(),
    currency: text("currency").notNull(),
    provider: text("provider").notNull(),
    providerRef: text("provider_ref"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    refundedAt: timestamp("refunded_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("purchases_provider_ref_unique").on(t.provider, t.providerRef),
    index("purchases_user_idx").on(t.userId),
    check("purchases_status_valid", sql`${t.status} IN (${inList(PURCHASE_STATUSES)})`),
    check("purchases_amount_non_negative", sql`${t.amountMinor} >= 0`),
  ],
);

/** A recurring plan as the provider reports it; the licence it grants follows `current_period_end`. */
export const subscriptions = pgTable(
  "subscriptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    productId: text("product_id")
      .notNull()
      .references(() => products.id),
    status: text("status", { enum: SUBSCRIPTION_STATUSES }).notNull(),
    currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }).notNull(),
    cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull(),
    provider: text("provider").notNull(),
    providerRef: text("provider_ref").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (t) => [
    uniqueIndex("subscriptions_provider_ref_unique").on(t.provider, t.providerRef),
    index("subscriptions_user_idx").on(t.userId),
    check("subscriptions_status_valid", sql`${t.status} IN (${inList(SUBSCRIPTION_STATUSES)})`),
  ],
);

/**
 * What a learner may open — the only table access checks read. Rows are never deleted: a refund
 * or an administrator's revocation sets `revoked_at`, so the history stays auditable.
 */
export const licences = pgTable(
  "licences",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kind: text("kind", { enum: LICENCE_KINDS }).notNull(),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    source: text("source", { enum: LICENCE_SOURCES }).notNull(),
    sourceId: text("source_id"),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  },
  (t) => [
    index("licences_user_idx").on(t.userId),
    check("licences_kind_valid", sql`${t.kind} IN (${inList(LICENCE_KINDS)})`),
    check("licences_source_valid", sql`${t.source} IN (${inList(LICENCE_SOURCES)})`),
    check("licences_period_valid", sql`${t.endsAt} IS NULL OR ${t.endsAt} > ${t.startsAt}`),
  ],
);

/** Provider webhook events already processed: the primary key makes processing idempotent. */
export const paymentEvents = pgTable(
  "payment_events",
  {
    provider: text("provider").notNull(),
    eventId: text("event_id").notNull(),
    type: text("type").notNull(),
    receivedAt: timestamp("received_at", { withTimezone: true }).notNull(),
  },
  (t) => [primaryKey({ name: "payment_events_pk", columns: [t.provider, t.eventId] })],
);

/**
 * Every administrative change, append-only. `actor_user_id` is kept (no cascade) even if the
 * administrator's account is later deleted, so it is a plain uuid, not a foreign key.
 */
export const adminAuditLog = pgTable(
  "admin_audit_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    actorUserId: uuid("actor_user_id").notNull(),
    action: text("action").notNull(),
    targetType: text("target_type").notNull(),
    targetId: text("target_id").notNull(),
    details: jsonb("details").$type<Record<string, unknown>>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  },
  (t) => [index("admin_audit_log_created_idx").on(t.createdAt)],
);

/** The payment provider's customer for each learner (one per provider), so renewals and the
 * billing portal find the same customer. */
export const paymentCustomers = pgTable(
  "payment_customers",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    provider: text("provider").notNull(),
    customerRef: text("customer_ref").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  },
  (t) => [
    primaryKey({ name: "payment_customers_pk", columns: [t.userId, t.provider] }),
    uniqueIndex("payment_customers_ref_unique").on(t.provider, t.customerRef),
  ],
);
