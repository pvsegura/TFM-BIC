import { isLicenceActive, isPurchasable, type Product, type Subscription } from "@verbysia/domain";

import type { Clock } from "../ports/clock.js";
import { CommerceNotFoundError, InvalidCommerceInputError } from "./commerce-use-cases.js";
import type {
  PaymentEvent,
  PaymentLedger,
  PaymentNotice,
  PaymentNotifier,
  PaymentProvider,
} from "./payments.js";
import type { AdminAuditLog, LicenceRepository, ProductRepository } from "./ports.js";

/** Days of access kept after a subscription period ends, so a slow renewal never locks anyone out. */
export const SUBSCRIPTION_GRACE_DAYS = 3;
const DAY_MS = 86_400_000;

export class PaymentsDisabledError extends Error {
  constructor() {
    super("Payments are not configured.");
    this.name = "PaymentsDisabledError";
  }
}

export class AlreadyOwnedError extends Error {
  constructor() {
    super("The learner already has this access.");
    this.name = "AlreadyOwnedError";
  }
}

export interface PaymentDeps {
  provider: PaymentProvider | null;
  ledger: PaymentLedger;
  products: ProductRepository;
  licences: LicenceRepository;
  audit: AdminAuditLog;
  clock: Clock;
  appBaseUrl: string;
  /** Tells the learner about purchases and payment problems; optional (nothing is sent without it). */
  notifier?: PaymentNotifier;
}

function requireProvider(deps: PaymentDeps): PaymentProvider {
  if (!deps.provider) throw new PaymentsDisabledError();
  return deps.provider;
}

/** Starts a checkout for a product the learner does not already own. The user comes from the session. */
export class StartCheckoutUseCase {
  constructor(private readonly deps: PaymentDeps) {}

  async execute(input: {
    userId: string;
    email: string;
    productId: string;
    /** The terms the learner accepted (with the immediate-delivery consent) before paying. */
    termsVersion: string;
  }): Promise<{ url: string }> {
    const provider = requireProvider(this.deps);
    const product = await this.deps.products.findById(input.productId);
    if (!product || !isPurchasable(product)) throw new CommerceNotFoundError("Product");

    const now = this.deps.clock.now();
    const owned = (await this.deps.licences.listByUser(input.userId)).filter((l) =>
      isLicenceActive(l, now),
    );
    const premium = owned.some((l) => l.kind === "PREMIUM_MONTHLY" || l.kind === "PREMIUM_YEARLY");
    if (
      owned.some((l) => l.kind === product.licenceKind) ||
      (premium && product.billing !== "one_off")
    ) {
      throw new AlreadyOwnedError();
    }

    const customerRef = await this.deps.ledger.findCustomerRef(input.userId, provider.name);
    const base = this.deps.appBaseUrl.replace(/\/$/, "");
    const session = await provider.createCheckout({
      product,
      userId: input.userId,
      email: input.email,
      customerRef,
      termsVersion: input.termsVersion,
      successUrl: `${base}/zakup/sukces`,
      cancelUrl: `${base}/cennik`,
    });
    if (!customerRef)
      await this.deps.ledger.saveCustomerRef(input.userId, provider.name, session.customerRef, now);
    return { url: session.url };
  }
}

/** The provider's billing portal for the learner's own customer record. */
export class OpenBillingPortalUseCase {
  constructor(private readonly deps: PaymentDeps) {}

  async execute(userId: string): Promise<{ url: string }> {
    const provider = requireProvider(this.deps);
    const customerRef = await this.deps.ledger.findCustomerRef(userId, provider.name);
    if (!customerRef) throw new CommerceNotFoundError("Customer");
    const base = this.deps.appBaseUrl.replace(/\/$/, "");
    return { url: await provider.createPortal(customerRef, `${base}/profile`) };
  }
}

/** Admin: gives every active product without a provider price one, and records it. */
export class SyncProductsWithProviderUseCase {
  constructor(private readonly deps: PaymentDeps) {}

  async execute(actorUserId: string): Promise<{ synced: string[] }> {
    const provider = requireProvider(this.deps);
    const now = this.deps.clock.now();
    const synced: string[] = [];
    for (const product of await this.deps.products.list()) {
      if (product.status !== "active" || product.providerPriceId) continue;
      const priceId = await provider.ensurePrice(product);
      await this.deps.products.update(product.id, { providerPriceId: priceId }, now);
      synced.push(product.id);
    }
    await this.deps.audit.record({
      actorUserId,
      action: "products.synced_with_provider",
      targetType: "product",
      targetId: synced.join(",") || "-",
      details: { provider: provider.name, synced },
      createdAt: now,
    });
    return { synced };
  }
}

/**
 * Applies one verified provider event. Every step is idempotent (keyed by the provider's own
 * references), so a redelivered event changes nothing; processed events are recorded last.
 * Access is granted here — never by the browser returning to the success page.
 */
export class HandlePaymentEventUseCase {
  constructor(private readonly deps: PaymentDeps) {}

  async execute(rawBody: Uint8Array, signature: string): Promise<{ handled: boolean }> {
    const provider = requireProvider(this.deps);
    const event = await provider.parseWebhook(rawBody, signature);
    const { ledger } = this.deps;
    if (await ledger.hasEvent(provider.name, event.eventId)) return { handled: false };

    const now = this.deps.clock.now();
    let notice: PaymentNotice | null = null;
    switch (event.kind) {
      case "checkout_completed":
        notice = await this.checkoutCompleted(provider.name, event, now);
        break;
      case "subscription_changed":
        notice = await this.subscriptionChanged(provider.name, event, now);
        break;
      case "refunded":
        await this.refunded(provider.name, event.paymentRef, now);
        break;
      case "ignored":
        break;
    }
    await ledger.recordEvent(
      provider.name,
      event.eventId,
      event.kind === "ignored" ? event.type : event.kind,
      now,
    );
    // Only after the event is recorded, so a redelivery never sends the same email twice.
    if (notice && this.deps.notifier) {
      await this.deps.notifier.notify(notice).catch(() => undefined);
    }
    return { handled: event.kind !== "ignored" };
  }

  private async product(productId: string): Promise<Product> {
    const product = await this.deps.products.findById(productId);
    if (!product)
      throw new InvalidCommerceInputError(`Unknown product in payment event: ${productId}`);
    return product;
  }

  private async checkoutCompleted(
    providerName: string,
    event: Extract<PaymentEvent, { kind: "checkout_completed" }>,
    now: Date,
  ): Promise<PaymentNotice | null> {
    const { ledger, licences } = this.deps;
    const product = await this.product(event.productId);
    const confirmed: PaymentNotice = {
      kind: "purchase_confirmed",
      userId: event.userId,
      productName: product.namePl,
      amountMinor: event.amountMinor,
      currency: event.currency,
    };
    await ledger.saveCustomerRef(event.userId, providerName, event.customerRef, now);

    if (event.subscription) {
      const subscription = await ledger.upsertSubscription(
        {
          userId: event.userId,
          productId: product.id,
          status: event.subscription.status,
          currentPeriodEnd: event.subscription.currentPeriodEnd,
          cancelAtPeriodEnd: event.subscription.cancelAtPeriodEnd,
          provider: providerName,
          providerRef: event.subscription.ref,
          updatedAt: now,
        },
        now,
      );
      const endsAt = new Date(
        event.subscription.currentPeriodEnd.getTime() + SUBSCRIPTION_GRACE_DAYS * DAY_MS,
      );
      const existing = await ledger.findLicenceBySource("subscription", subscription.id);
      if (existing) {
        await ledger.setLicenceEnd(existing.id, endsAt);
        return null;
      } else {
        await licences.grant({
          userId: event.userId,
          kind: product.licenceKind,
          startsAt: now,
          endsAt,
          source: "subscription",
          sourceId: subscription.id,
          note: null,
          createdAt: now,
        });
      }
      return confirmed;
    }

    const known = await ledger.findPurchaseByRef(providerName, event.paymentRef);
    const purchase =
      known ??
      (await ledger.createPaidPurchase({
        userId: event.userId,
        productId: product.id,
        amountMinor: event.amountMinor,
        currency: event.currency,
        provider: providerName,
        providerRef: event.paymentRef,
        createdAt: now,
        paidAt: now,
      }));
    if (!(await ledger.findLicenceBySource("purchase", purchase.id))) {
      await licences.grant({
        userId: event.userId,
        kind: product.licenceKind,
        startsAt: now,
        endsAt:
          product.accessDays === null
            ? null
            : new Date(now.getTime() + product.accessDays * DAY_MS),
        source: "purchase",
        sourceId: purchase.id,
        note: null,
        createdAt: now,
      });
    }
    return known ? null : confirmed;
  }

  private async subscriptionChanged(
    providerName: string,
    event: Extract<PaymentEvent, { kind: "subscription_changed" }>,
    now: Date,
  ): Promise<PaymentNotice | null> {
    const { ledger } = this.deps;
    const known = await ledger.findSubscriptionByRef(providerName, event.subscriptionRef);
    // A change for a subscription we never saw being bought (e.g. created by hand in the
    // provider's dashboard) has no learner to attach to: recorded and otherwise ignored.
    if (!known) return null;
    // Read before the upsert: a repository may hand back the same object it then updates.
    const previousStatus = known.status;
    const subscription = await ledger.upsertSubscription(
      {
        userId: known.userId,
        productId: known.productId,
        status: event.status,
        currentPeriodEnd: event.currentPeriodEnd,
        cancelAtPeriodEnd: event.cancelAtPeriodEnd,
        provider: providerName,
        providerRef: event.subscriptionRef,
        updatedAt: now,
      },
      now,
    );
    const licence = await ledger.findLicenceBySource("subscription", subscription.id);
    if (!licence) return null;
    const ended = event.status === "cancelled" || event.status === "expired";
    await ledger.setLicenceEnd(
      licence.id,
      ended ? now : new Date(event.currentPeriodEnd.getTime() + SUBSCRIPTION_GRACE_DAYS * DAY_MS),
    );
    return this.statusNotice(previousStatus, event.status, known.userId, known.productId);
  }

  /** A notice only when the status actually changes into a state the learner must hear about. */
  private async statusNotice(
    before: Subscription["status"],
    after: Subscription["status"],
    userId: string,
    productId: string,
  ): Promise<PaymentNotice | null> {
    if (before === after) return null;
    const wasEnded = before === "cancelled" || before === "expired";
    const kind =
      after === "past_due"
        ? "payment_failed"
        : (after === "cancelled" || after === "expired") && !wasEnded
          ? "subscription_ended"
          : null;
    if (!kind) return null;
    const product = await this.product(productId);
    return { kind, userId, productName: product.namePl };
  }

  private async refunded(providerName: string, paymentRef: string, now: Date) {
    const { ledger, licences } = this.deps;
    const purchase = await ledger.findPurchaseByRef(providerName, paymentRef);
    if (!purchase) return;
    await ledger.markPurchaseRefunded(purchase.id, now);
    const licence = await ledger.findLicenceBySource("purchase", purchase.id);
    if (licence) await licences.revoke(licence.id, now);
  }
}
