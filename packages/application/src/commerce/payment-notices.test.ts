import type { User } from "@verbysia/domain";
import { describe, expect, it } from "vitest";

import { EmailPaymentNotifier } from "../email/email-payment-notifier.js";
import type {
  TransactionalEmailRequest,
  TransactionalEmailSender,
} from "../email/email-senders.js";
import { renderEmail } from "../email/templates/render-email.js";
import { HandlePaymentEventUseCase, type PaymentDeps } from "./payment-use-cases.js";
import type { PaymentEvent, PaymentNotice } from "./payments.js";
import {
  FakeCommerce,
  FakePaymentLedger,
  FakePaymentProvider,
  fakeProduct,
} from "./test-support/fakes.js";

const NOW = new Date("2026-11-20T10:00:00.000Z");
const BODY = new Uint8Array([1]);

function setup() {
  const commerce = new FakeCommerce();
  commerce.productsById.set(
    "premium-monthly",
    fakeProduct({
      id: "premium-monthly",
      licenceKind: "PREMIUM_MONTHLY",
      billing: "monthly",
      namePl: "Premium miesięczny",
    }),
  );
  const provider = new FakePaymentProvider();
  const notices: PaymentNotice[] = [];
  const deps: PaymentDeps = {
    provider,
    ledger: new FakePaymentLedger(commerce),
    products: commerce.products,
    licences: commerce.licences,
    audit: commerce.audit,
    clock: { now: () => NOW },
    appBaseUrl: "https://www.verbysia.com",
    notifier: {
      notify: (notice) => {
        notices.push(notice);
        return Promise.resolve();
      },
    },
  };
  const useCase = new HandlePaymentEventUseCase(deps);
  const send = (event: PaymentEvent) => {
    provider.nextEvent = event;
    return useCase.execute(BODY, "sig");
  };
  return { send, notices, deps };
}

const oneOff: PaymentEvent = {
  kind: "checkout_completed",
  eventId: "evt_1",
  userId: "user-1",
  productId: "course-a1",
  customerRef: "cus_1",
  paymentRef: "pi_1",
  amountMinor: 14900,
  currency: "pln",
  subscription: null,
};

const subscribed: PaymentEvent = {
  ...oneOff,
  eventId: "evt_sub",
  productId: "premium-monthly",
  paymentRef: "cs_2",
  amountMinor: 4900,
  subscription: {
    ref: "sub_1",
    status: "active",
    currentPeriodEnd: new Date("2026-12-20T00:00:00.000Z"),
    cancelAtPeriodEnd: false,
  },
};

function changed(eventId: string, status: "active" | "past_due" | "cancelled"): PaymentEvent {
  return {
    kind: "subscription_changed",
    eventId,
    subscriptionRef: "sub_1",
    status,
    currentPeriodEnd: new Date("2026-12-20T00:00:00.000Z"),
    cancelAtPeriodEnd: false,
  };
}

describe("HandlePaymentEventUseCase — learner notices", () => {
  it("confirms a one-off purchase once, even when the provider redelivers the payment", async () => {
    const { send, notices } = setup();
    await send(oneOff);
    await send({ ...oneOff, eventId: "evt_1_again" });

    expect(notices).toEqual([
      {
        kind: "purchase_confirmed",
        userId: "user-1",
        productName: "Kurs hiszpańskiego A1",
        amountMinor: 14900,
        currency: "pln",
      },
    ]);
  });

  it("confirms a new subscription, then warns once about a failed renewal and once when it ends", async () => {
    const { send, notices } = setup();
    await send(subscribed);
    await send(changed("evt_a", "past_due"));
    await send(changed("evt_b", "past_due"));
    await send(changed("evt_c", "cancelled"));
    await send(changed("evt_d", "cancelled"));

    expect(notices.map((n) => n.kind)).toEqual([
      "purchase_confirmed",
      "payment_failed",
      "subscription_ended",
    ]);
  });

  it("still grants access when the notifier fails", async () => {
    const { deps } = setup();
    const provider = deps.provider as FakePaymentProvider;
    provider.nextEvent = oneOff;
    const useCase = new HandlePaymentEventUseCase({
      ...deps,
      notifier: { notify: () => Promise.reject(new Error("smtp down")) },
    });

    await expect(useCase.execute(BODY, "sig")).resolves.toEqual({ handled: true });
  });
});

describe("EmailPaymentNotifier", () => {
  const user = { id: "user-1", email: "anna@example.pl" } as User;

  it("emails the account's own address with links into the app", async () => {
    const sent: { to: string; request: TransactionalEmailRequest }[] = [];
    const sender: TransactionalEmailSender = {
      send: (to, request) => {
        sent.push({ to, request });
        return Promise.resolve();
      },
    };
    const notifier = new EmailPaymentNotifier(
      { findById: () => Promise.resolve(user) },
      sender,
      "https://www.verbysia.com/",
    );

    await notifier.notify({ kind: "payment_failed", userId: "user-1", productName: "Premium" });

    expect(sent).toEqual([
      {
        to: "anna@example.pl",
        request: {
          template: "payment-failed",
          variables: { productName: "Premium", billingUrl: "https://www.verbysia.com/profile" },
        },
      },
    ]);
  });

  it("reports a delivery failure instead of throwing", async () => {
    const errors: string[] = [];
    const notifier = new EmailPaymentNotifier(
      { findById: () => Promise.resolve(user) },
      { send: () => Promise.reject(new Error("down")) },
      "https://www.verbysia.com",
      (_error, kind) => errors.push(kind),
    );

    await expect(
      notifier.notify({ kind: "subscription_ended", userId: "user-1", productName: "Premium" }),
    ).resolves.toBeUndefined();
    expect(errors).toEqual(["subscription_ended"]);
  });
});

describe("renderEmail — commerce templates in Polish", () => {
  const context = { appBaseUrl: "https://www.verbysia.com", locale: "pl" as const };

  it("renders the purchase receipt with the product, the amount in złoty and the course link", () => {
    const email = renderEmail(
      {
        template: "purchase-confirmation",
        variables: {
          productName: "Kurs hiszpańskiego A1",
          amountMinor: 14900,
          currency: "pln",
          courseUrl: "https://www.verbysia.com/learn/lessons",
        },
      },
      context,
    );

    expect(email.subject).toBe("Dziękujemy za zakup: Kurs hiszpańskiego A1");
    expect(email.html).toContain('<html lang="pl">');
    expect(email.text).toMatch(/Kwota: 149,00\s?zł/);
    expect(email.html).toContain('href="https://www.verbysia.com/learn/lessons"');
    expect(email.html).not.toMatch(/unsubscribe|wypisz/i);
  });

  it("escapes the product name and refuses links outside the app", () => {
    const email = renderEmail(
      {
        template: "subscription-ended",
        variables: {
          productName: "<b>Premium</b>",
          pricingUrl: "https://www.verbysia.com/cennik",
        },
      },
      context,
    );
    expect(email.html).toContain("&lt;b&gt;Premium&lt;/b&gt;");
    expect(email.html).not.toContain("<b>Premium</b>");

    expect(() =>
      renderEmail(
        {
          template: "payment-failed",
          variables: { productName: "Premium", billingUrl: "https://evil.example/profile" },
        },
        context,
      ),
    ).toThrow();
  });
});
