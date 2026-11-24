import { randomUUID } from "node:crypto";

import { fakeProduct } from "@verbysia/application/testing";
import { loadEnv } from "@verbysia/config";
import type { FastifyInstance } from "fastify";
import { afterEach, describe, expect, it } from "vitest";

import { SESSION_COOKIE_NAME } from "../constants/session-cookie.js";
import { buildServer } from "../server.js";
import { buildTestDeps } from "../test-support/build-test-deps.js";

const APP_BASE_URL = "https://app.example.com";
const PASSWORD = "correct-password";
const NOW = new Date("2026-01-01T00:00:00.000Z");
const FUTURE = new Date("2026-02-01T00:00:00.000Z");

let app: FastifyInstance | undefined;
afterEach(async () => {
  await app?.close();
  app = undefined;
});

function build() {
  const testDeps = buildTestDeps(NOW);
  testDeps.commerce.productsById.set("course-a1", fakeProduct({ providerPriceId: "price_a1" }));
  testDeps.commerce.productsById.set(
    "premium-monthly",
    fakeProduct({
      id: "premium-monthly",
      licenceKind: "PREMIUM_MONTHLY",
      billing: "monthly",
      priceMinor: 4900,
      providerPriceId: "price_pm",
    }),
  );
  app = buildServer(
    loadEnv({ NODE_ENV: "test", APP_BASE_URL, AUTH_SESSION_SECRET: "test-secret-value" }),
    testDeps.appDeps,
  );
  return { app, ...testDeps };
}
type Built = ReturnType<typeof build>;

async function signIn(
  built: Built,
  role: "STUDENT" | "ADMIN" = "STUDENT",
  email = "buyer@example.com",
) {
  const user = built.userRepository.seed(role, {
    id: randomUUID(),
    email,
    normalizedEmail: email,
    passwordHash: await built.passwordHasher.hash(PASSWORD),
    emailVerified: true,
  });
  built.commerce.userRows.push({ id: user.id, email, role, emailVerified: true, createdAt: NOW });
  const response = await built.app.inject({
    method: "POST",
    url: "/auth/login",
    payload: { email, password: PASSWORD },
  });
  const cookie = response.cookies.find((c) => c.name === SESSION_COOKIE_NAME)?.value ?? "";
  return { userId: user.id, cookies: { [SESSION_COOKIE_NAME]: cookie } };
}

function webhook(built: Built, body = "{}") {
  return built.app.inject({
    method: "POST",
    url: "/webhooks/stripe",
    headers: { "content-type": "application/json", "stripe-signature": "t=1,v1=fake" },
    payload: body,
  });
}

describe("checkout", () => {
  it("returns the hosted checkout URL for the session's user", async () => {
    const built = build();
    const { userId, cookies } = await signIn(built);
    const response = await built.app.inject({
      method: "POST",
      url: "/checkout",
      headers: { origin: APP_BASE_URL },
      cookies,
      payload: { productId: "course-a1" },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ url: "https://checkout.example/course-a1" });
    expect(built.paymentProvider.checkouts[0]).toMatchObject({
      userId,
      email: "buyer@example.com",
    });
    expect(built.paymentProvider.checkouts[0]?.successUrl).toBe(`${APP_BASE_URL}/zakup/sukces`);
  });

  it("refuses anonymous callers, other origins and products already owned", async () => {
    const built = build();
    const { userId, cookies } = await signIn(built);
    await built.commerce.licences.grant({
      userId,
      kind: "COURSE_A1",
      startsAt: NOW,
      endsAt: null,
      source: "admin",
      sourceId: null,
      note: null,
      createdAt: NOW,
    });
    const send = (headers: Record<string, string>, withCookies: boolean) =>
      built.app.inject({
        method: "POST",
        url: "/checkout",
        headers,
        ...(withCookies ? { cookies } : {}),
        payload: { productId: "course-a1" },
      });

    expect((await send({ origin: APP_BASE_URL }, false)).statusCode).toBe(401);
    expect((await send({ origin: "https://evil.example" }, true)).statusCode).toBe(403);
    expect((await send({ origin: APP_BASE_URL }, true)).statusCode).toBe(409);
  });
});

describe("Stripe webhook", () => {
  it("refuses a request whose signature does not verify", async () => {
    const built = build();
    expect((await webhook(built, "bad-signature")).statusCode).toBe(400);
  });

  it("grants the course licence once for a paid checkout, even when the event is redelivered", async () => {
    const built = build();
    const { userId } = await signIn(built);
    built.paymentProvider.nextEvent = {
      kind: "checkout_completed",
      eventId: "evt_1",
      userId,
      productId: "course-a1",
      customerRef: "cus_1",
      paymentRef: "pi_1",
      amountMinor: 14900,
      currency: "PLN",
      subscription: null,
    };

    expect((await webhook(built)).statusCode).toBe(200);
    expect((await webhook(built)).statusCode).toBe(200);

    const licences = built.commerce.licenceRows.filter((l) => l.userId === userId);
    expect(licences).toHaveLength(1);
    expect(licences[0]).toMatchObject({ kind: "COURSE_A1", endsAt: null, source: "purchase" });
    expect(built.paymentLedger.purchaseRows).toHaveLength(1);
  });

  it("follows a subscription: grants Premium to the period end, extends it, and ends it on cancellation", async () => {
    const built = build();
    const { userId } = await signIn(built);
    built.paymentProvider.nextEvent = {
      kind: "checkout_completed",
      eventId: "evt_sub_1",
      userId,
      productId: "premium-monthly",
      customerRef: "cus_2",
      paymentRef: "cs_2",
      amountMinor: 4900,
      currency: "PLN",
      subscription: {
        ref: "sub_1",
        status: "active",
        currentPeriodEnd: FUTURE,
        cancelAtPeriodEnd: false,
      },
    };
    await webhook(built);
    const licence = built.commerce.licenceRows.find((l) => l.userId === userId);
    expect(licence?.kind).toBe("PREMIUM_MONTHLY");
    expect(licence?.endsAt?.getTime()).toBeGreaterThan(FUTURE.getTime());

    const renewed = new Date("2026-03-01T00:00:00.000Z");
    built.paymentProvider.nextEvent = {
      kind: "subscription_changed",
      eventId: "evt_sub_2",
      subscriptionRef: "sub_1",
      status: "active",
      currentPeriodEnd: renewed,
      cancelAtPeriodEnd: false,
    };
    await webhook(built);
    expect(licence?.endsAt?.getTime()).toBeGreaterThan(renewed.getTime());

    built.paymentProvider.nextEvent = {
      kind: "subscription_changed",
      eventId: "evt_sub_3",
      subscriptionRef: "sub_1",
      status: "cancelled",
      currentPeriodEnd: renewed,
      cancelAtPeriodEnd: false,
    };
    await webhook(built);
    expect(licence?.endsAt).toEqual(NOW);
  });

  it("revokes the licence of a refunded purchase", async () => {
    const built = build();
    const { userId } = await signIn(built);
    built.paymentProvider.nextEvent = {
      kind: "checkout_completed",
      eventId: "evt_a",
      userId,
      productId: "course-a1",
      customerRef: "cus_3",
      paymentRef: "pi_3",
      amountMinor: 14900,
      currency: "PLN",
      subscription: null,
    };
    await webhook(built);
    built.paymentProvider.nextEvent = { kind: "refunded", eventId: "evt_b", paymentRef: "pi_3" };
    await webhook(built);

    expect(built.commerce.licenceRows.find((l) => l.userId === userId)?.revokedAt).toEqual(NOW);
    expect(built.paymentLedger.purchaseRows[0]?.status).toBe("refunded");
  });
});

describe("admin sync with the payment provider", () => {
  it("creates provider prices for active products that have none, and audits it", async () => {
    const built = build();
    built.commerce.productsById.set("course-a1", fakeProduct({ providerPriceId: null }));
    const admin = await signIn(built, "ADMIN", "admin@example.com");
    const response = await built.app.inject({
      method: "POST",
      url: "/admin/products/sync-provider",
      headers: { origin: APP_BASE_URL },
      cookies: admin.cookies,
    });

    expect(response.json()).toEqual({ synced: ["course-a1"] });
    expect(built.commerce.productsById.get("course-a1")?.providerPriceId).toBe("price_course-a1");
    expect(built.commerce.auditRows.map((e) => e.action)).toContain(
      "products.synced_with_provider",
    );
  });
});
