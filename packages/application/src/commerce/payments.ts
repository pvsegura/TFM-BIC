import type { Product, Purchase, Subscription, SubscriptionStatus } from "@verbysia/domain";

/**
 * The payment provider as the application sees it (Stripe today). Webhook payloads are verified
 * and translated into the few facts the business cares about; nothing else of the provider leaks
 * past this port.
 */
export interface CheckoutRequest {
  product: Product;
  userId: string;
  email: string;
  customerRef: string | null;
  /** Recorded with the payment as evidence of the consents given before checkout. */
  termsVersion: string;
  successUrl: string;
  cancelUrl: string;
}

export type PaymentEvent =
  | {
      kind: "checkout_completed";
      eventId: string;
      userId: string;
      productId: string;
      customerRef: string;
      /** The provider's payment reference (one-off) or the checkout session id. */
      paymentRef: string;
      amountMinor: number;
      currency: string;
      subscription: {
        ref: string;
        status: SubscriptionStatus;
        currentPeriodEnd: Date;
        cancelAtPeriodEnd: boolean;
      } | null;
    }
  | {
      kind: "subscription_changed";
      eventId: string;
      subscriptionRef: string;
      status: SubscriptionStatus;
      currentPeriodEnd: Date;
      cancelAtPeriodEnd: boolean;
    }
  | { kind: "refunded"; eventId: string; paymentRef: string }
  | { kind: "ignored"; eventId: string; type: string };

/** What the learner is told after a verified payment event (email today). */
export type PaymentNotice =
  | {
      kind: "purchase_confirmed";
      userId: string;
      productName: string;
      amountMinor: number;
      currency: string;
    }
  | { kind: "payment_failed"; userId: string; productName: string }
  | { kind: "subscription_ended"; userId: string; productName: string };

/**
 * Best effort: a notice that cannot be delivered never undoes or blocks the access change, and
 * the webhook is not retried because of it.
 */
export interface PaymentNotifier {
  notify(notice: PaymentNotice): Promise<void>;
}

export class InvalidWebhookError extends Error {
  constructor() {
    super("Invalid payment webhook signature or payload.");
    this.name = "InvalidWebhookError";
  }
}

export interface PaymentProvider {
  readonly name: string;
  /** Creates (or reuses) the customer and a hosted checkout page; returns where to send the buyer. */
  createCheckout(request: CheckoutRequest): Promise<{ url: string; customerRef: string }>;
  /** The provider's self-service page (cancel, change card, invoices). */
  createPortal(customerRef: string, returnUrl: string): Promise<string>;
  /** Makes sure the provider has a product and price for this catalogue entry; returns the price id. */
  ensurePrice(product: Product): Promise<string>;
  /** Verifies the signature and translates the event. Throws InvalidWebhookError when it is not genuine. */
  parseWebhook(rawBody: Uint8Array, signature: string): Promise<PaymentEvent>;
}

/** The write side the webhook needs, kept out of the read-only commerce ports. */
export interface PaymentLedger {
  hasEvent(provider: string, eventId: string): Promise<boolean>;
  recordEvent(provider: string, eventId: string, type: string, at: Date): Promise<void>;
  findCustomerRef(userId: string, provider: string): Promise<string | null>;
  saveCustomerRef(userId: string, provider: string, customerRef: string, at: Date): Promise<void>;
  findPurchaseByRef(provider: string, providerRef: string): Promise<Purchase | null>;
  createPaidPurchase(input: Omit<Purchase, "id" | "refundedAt" | "status">): Promise<Purchase>;
  markPurchaseRefunded(purchaseId: string, at: Date): Promise<void>;
  upsertSubscription(
    input: Omit<Subscription, "id" | "createdAt">,
    at: Date,
  ): Promise<Subscription>;
  findSubscriptionByRef(provider: string, providerRef: string): Promise<Subscription | null>;
  /** The licence a purchase or subscription granted, if any. */
  findLicenceBySource(
    source: "purchase" | "subscription",
    sourceId: string,
  ): Promise<{ id: string } | null>;
  setLicenceEnd(licenceId: string, endsAt: Date | null): Promise<void>;
}
