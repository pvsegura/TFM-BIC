import type { PaymentLedger } from "@verbysia/application";
import { and, eq } from "drizzle-orm";

import type { CommerceDb } from "./db/client.js";
import {
  licences,
  paymentCustomers,
  paymentEvents,
  purchases,
  subscriptions,
} from "./db/schema.js";

/**
 * The webhook's write side in Postgres. Every write is keyed by the provider's own references
 * (unique indexes on provider + ref), so replaying an event cannot duplicate a purchase,
 * subscription or customer.
 */
export function createPaymentLedger(db: CommerceDb): PaymentLedger {
  return {
    hasEvent: async (provider, eventId) => {
      const [row] = await db
        .select({ eventId: paymentEvents.eventId })
        .from(paymentEvents)
        .where(and(eq(paymentEvents.provider, provider), eq(paymentEvents.eventId, eventId)));
      return row !== undefined;
    },
    recordEvent: async (provider, eventId, type, at) => {
      await db
        .insert(paymentEvents)
        .values({ provider, eventId, type, receivedAt: at })
        .onConflictDoNothing();
    },
    findCustomerRef: async (userId, provider) => {
      const [row] = await db
        .select({ ref: paymentCustomers.customerRef })
        .from(paymentCustomers)
        .where(and(eq(paymentCustomers.userId, userId), eq(paymentCustomers.provider, provider)));
      return row?.ref ?? null;
    },
    saveCustomerRef: async (userId, provider, customerRef, at) => {
      await db
        .insert(paymentCustomers)
        .values({ userId, provider, customerRef, createdAt: at })
        .onConflictDoNothing();
    },
    findPurchaseByRef: async (provider, providerRef) => {
      const [row] = await db
        .select()
        .from(purchases)
        .where(and(eq(purchases.provider, provider), eq(purchases.providerRef, providerRef)));
      return row ?? null;
    },
    createPaidPurchase: async (input) => {
      const [row] = await db
        .insert(purchases)
        .values({ ...input, status: "paid", refundedAt: null })
        .onConflictDoNothing()
        .returning();
      if (row) return row;
      // Lost a race with a redelivered event: the other insert won — return that row.
      const [existing] = await db
        .select()
        .from(purchases)
        .where(
          and(
            eq(purchases.provider, input.provider),
            eq(purchases.providerRef, input.providerRef ?? ""),
          ),
        );
      if (!existing) throw new Error("Purchase insert returned no row.");
      return existing;
    },
    markPurchaseRefunded: async (purchaseId, at) => {
      await db
        .update(purchases)
        .set({ status: "refunded", refundedAt: at })
        .where(eq(purchases.id, purchaseId));
    },
    upsertSubscription: async (input, at) => {
      const [row] = await db
        .insert(subscriptions)
        .values({ ...input, createdAt: at })
        .onConflictDoUpdate({
          target: [subscriptions.provider, subscriptions.providerRef],
          set: {
            status: input.status,
            currentPeriodEnd: input.currentPeriodEnd,
            cancelAtPeriodEnd: input.cancelAtPeriodEnd,
            updatedAt: input.updatedAt,
          },
        })
        .returning();
      if (!row) throw new Error("Subscription upsert returned no row.");
      return row;
    },
    findSubscriptionByRef: async (provider, providerRef) => {
      const [row] = await db
        .select()
        .from(subscriptions)
        .where(
          and(eq(subscriptions.provider, provider), eq(subscriptions.providerRef, providerRef)),
        );
      return row ?? null;
    },
    findLicenceBySource: async (source, sourceId) => {
      const [row] = await db
        .select({ id: licences.id })
        .from(licences)
        .where(and(eq(licences.source, source), eq(licences.sourceId, sourceId)));
      return row ?? null;
    },
    setLicenceEnd: async (licenceId, endsAt) => {
      await db.update(licences).set({ endsAt }).where(eq(licences.id, licenceId));
    },
  };
}
