import {
  InvalidWebhookError,
  type CheckoutRequest,
  type PaymentEvent,
  type PaymentProvider,
} from "@verbysia/application";
import type { Product, SubscriptionStatus } from "@verbysia/domain";
import Stripe from "stripe";

/**
 * Stripe behind the application's PaymentProvider port. Hosted Checkout (cards, BLIK, P24 —
 * whatever is enabled in the Stripe dashboard) and the hosted customer portal: no card data ever
 * touches Verbysia. Webhooks are verified with the endpoint's signing secret before anything is
 * read from them.
 */
export class StripePaymentProvider implements PaymentProvider {
  readonly name = "stripe";
  private readonly stripe: Stripe;

  constructor(
    secretKey: string,
    private readonly webhookSecret: string,
  ) {
    this.stripe = new Stripe(secretKey, { maxNetworkRetries: 2, timeout: 20_000 });
  }

  async createCheckout(request: CheckoutRequest): Promise<{ url: string; customerRef: string }> {
    const { product } = request;
    if (!product.providerPriceId) throw new Error(`Product ${product.id} has no provider price.`);
    const customerRef =
      request.customerRef ??
      (
        await this.stripe.customers.create({
          email: request.email,
          metadata: { userId: request.userId },
          preferred_locales: ["pl"],
        })
      ).id;
    const subscription = product.billing !== "one_off";
    const metadata = { userId: request.userId, productId: product.id };
    // Evidence of the consents given on our site before checkout (terms + immediate delivery).
    const consent = { termsVersion: request.termsVersion, immediateDeliveryConsent: "accepted" };
    const session = await this.stripe.checkout.sessions.create({
      mode: subscription ? "subscription" : "payment",
      customer: customerRef,
      client_reference_id: request.userId,
      line_items: [{ price: product.providerPriceId, quantity: 1 }],
      locale: "pl",
      success_url: `${request.successUrl}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: request.cancelUrl,
      metadata: { ...metadata, ...consent },
      ...(subscription
        ? { subscription_data: { metadata } }
        : { payment_intent_data: { metadata } }),
      // Consent is collected on our own buy dialog (terms + immediate delivery). Stripe's own
      // consent_collection would also need the terms URL set in the Stripe dashboard.
    });
    if (!session.url) throw new Error("Stripe returned a checkout session without a URL.");
    return { url: session.url, customerRef };
  }

  async createPortal(customerRef: string, returnUrl: string): Promise<string> {
    const session = await this.stripe.billingPortal.sessions.create({
      customer: customerRef,
      return_url: returnUrl,
      locale: "pl",
    });
    return session.url;
  }

  async ensurePrice(product: Product): Promise<string> {
    const stripeProduct = await this.stripe.products.create({
      name: product.namePl,
      description: product.descriptionPl,
      metadata: { verbysiaProductId: product.id },
    });
    const price = await this.stripe.prices.create({
      product: stripeProduct.id,
      currency: product.currency.toLowerCase(),
      unit_amount: product.priceMinor,
      tax_behavior: "inclusive",
      ...(product.billing === "one_off"
        ? {}
        : { recurring: { interval: product.billing === "monthly" ? "month" : "year" } }),
      metadata: { verbysiaProductId: product.id },
    });
    return price.id;
  }

  async parseWebhook(rawBody: Uint8Array, signature: string): Promise<PaymentEvent> {
    let event: Stripe.Event;
    try {
      event = this.stripe.webhooks.constructEvent(
        Buffer.from(rawBody),
        signature,
        this.webhookSecret,
      );
    } catch {
      throw new InvalidWebhookError();
    }

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const userId = session.metadata?.userId ?? session.client_reference_id;
        const productId = session.metadata?.productId;
        const customerRef =
          typeof session.customer === "string" ? session.customer : session.customer?.id;
        if (!userId || !productId || !customerRef || session.payment_status === "unpaid") {
          return { kind: "ignored", eventId: event.id, type: event.type };
        }
        const subscriptionId =
          typeof session.subscription === "string"
            ? session.subscription
            : session.subscription?.id;
        const subscription = subscriptionId ? await this.subscriptionFacts(subscriptionId) : null;
        const paymentRef =
          (typeof session.payment_intent === "string"
            ? session.payment_intent
            : session.payment_intent?.id) ?? session.id;
        return {
          kind: "checkout_completed",
          eventId: event.id,
          userId,
          productId,
          customerRef,
          paymentRef,
          amountMinor: session.amount_total ?? 0,
          currency: (session.currency ?? "pln").toUpperCase(),
          subscription,
        };
      }
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const facts = this.factsOf(event.data.object);
        return {
          kind: "subscription_changed",
          eventId: event.id,
          subscriptionRef: facts.ref,
          status: event.type === "customer.subscription.deleted" ? "cancelled" : facts.status,
          currentPeriodEnd: facts.currentPeriodEnd,
          cancelAtPeriodEnd: facts.cancelAtPeriodEnd,
        };
      }
      case "invoice.paid":
      case "invoice.payment_failed": {
        const invoice = event.data.object;
        const subscriptionId = invoiceSubscriptionId(invoice);
        if (!subscriptionId) return { kind: "ignored", eventId: event.id, type: event.type };
        const facts = await this.subscriptionFacts(subscriptionId);
        return {
          kind: "subscription_changed",
          eventId: event.id,
          subscriptionRef: facts.ref,
          status: event.type === "invoice.payment_failed" ? "past_due" : facts.status,
          currentPeriodEnd: facts.currentPeriodEnd,
          cancelAtPeriodEnd: facts.cancelAtPeriodEnd,
        };
      }
      case "charge.refunded": {
        const charge = event.data.object;
        const paymentRef =
          typeof charge.payment_intent === "string"
            ? charge.payment_intent
            : charge.payment_intent?.id;
        return paymentRef && charge.refunded
          ? { kind: "refunded", eventId: event.id, paymentRef }
          : { kind: "ignored", eventId: event.id, type: event.type };
      }
      default:
        return { kind: "ignored", eventId: event.id, type: event.type };
    }
  }

  private async subscriptionFacts(subscriptionId: string) {
    return this.factsOf(await this.stripe.subscriptions.retrieve(subscriptionId));
  }

  private factsOf(subscription: Stripe.Subscription) {
    // The period end lives on the subscription items in current API versions.
    const item = subscription.items.data[0] as
      (Stripe.SubscriptionItem & { current_period_end?: number }) | undefined;
    const legacy = (subscription as Stripe.Subscription & { current_period_end?: number })
      .current_period_end;
    const periodEnd = item?.current_period_end ?? legacy ?? Math.floor(Date.now() / 1000);
    return {
      ref: subscription.id,
      status: statusOf(subscription.status),
      currentPeriodEnd: new Date(periodEnd * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    };
  }
}

function statusOf(status: Stripe.Subscription.Status): SubscriptionStatus {
  if (status === "active" || status === "trialing") return "active";
  if (status === "past_due" || status === "unpaid" || status === "incomplete") return "past_due";
  if (status === "canceled") return "cancelled";
  return "expired";
}

function invoiceSubscriptionId(invoice: Stripe.Invoice): string | null {
  const parent = (
    invoice as Stripe.Invoice & {
      parent?: { subscription_details?: { subscription?: string | { id: string } } };
    }
  ).parent?.subscription_details?.subscription;
  const legacy = (invoice as Stripe.Invoice & { subscription?: string | { id: string } | null })
    .subscription;
  const value = parent ?? legacy;
  if (!value) return null;
  return typeof value === "string" ? value : value.id;
}
