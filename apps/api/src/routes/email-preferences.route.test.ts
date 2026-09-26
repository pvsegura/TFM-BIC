import { loadEnv } from "@tfm-bic/config";
import { NEWSLETTER_CONSENT_VERSION } from "@tfm-bic/domain";
import type { FastifyInstance } from "fastify";
import { afterEach, describe, expect, it } from "vitest";

import { SESSION_COOKIE_NAME } from "../constants/session-cookie.js";
import { buildServer } from "../server.js";
import { buildTestDeps } from "../test-support/build-test-deps.js";

const APP_BASE_URL = "https://app.example.com";
const PASSWORD = "correct-password";
const CONSENT = { consent: true, consentVersion: NEWSLETTER_CONSENT_VERSION };

let app: FastifyInstance | undefined;

afterEach(async () => {
  await app?.close();
  app = undefined;
});

function build(envOverrides: Record<string, string> = {}) {
  const testDeps = buildTestDeps();
  app = buildServer(
    loadEnv({
      NODE_ENV: "test",
      APP_BASE_URL,
      AUTH_SESSION_SECRET: "test-secret-value",
      ...envOverrides,
    }),
    testDeps.deps,
    testDeps.profileDeps,
    testDeps.contentDeps,
    testDeps.lessonDeps,
    testDeps.exerciseDeps,
    testDeps.gamificationDeps,
    testDeps.vocabularyDeps,
    testDeps.phoneticsDeps,
    testDeps.videoDeps,
    testDeps.audioDeps,
    testDeps.teachingDeps,
    testDeps.emailDeps,
  );
  return { app, ...testDeps };
}

type Built = ReturnType<typeof build>;

async function signIn(built: Built, email = "ada@example.com") {
  const user = built.userRepository.seed("STUDENT", {
    email,
    normalizedEmail: email,
    passwordHash: await built.passwordHasher.hash(PASSWORD),
    emailVerified: true,
  });
  const response = await built.app.inject({
    method: "POST",
    url: "/auth/login",
    payload: { email, password: PASSWORD },
  });
  const cookie = response.cookies.find((c) => c.name === SESSION_COOKIE_NAME)?.value;
  if (!cookie) {
    throw new Error("test setup failed: no session cookie");
  }
  return { user, cookie };
}

function request(
  built: Built,
  method: "GET" | "POST" | "DELETE",
  url: string,
  options: { cookie?: string; payload?: unknown; headers?: Record<string, string> } = {},
) {
  return built.app.inject({
    method,
    url,
    ...(options.payload === undefined ? {} : { payload: options.payload as object }),
    headers: options.headers ?? {},
    ...(options.cookie ? { cookies: { [SESSION_COOKIE_NAME]: options.cookie } } : {}),
  });
}

function confirmationTokenFrom(built: Built, email: string): string {
  const captured = built.emailProvider.findLastSentTo(email, "newsletter-confirmation");
  const link = captured?.links[0];
  if (!link) {
    throw new Error("no confirmation email captured");
  }
  return new URL(link).searchParams.get("token") ?? "";
}

async function subscribeAndConfirm(built: Built, cookie: string, email: string): Promise<void> {
  await request(built, "POST", "/email-preferences/newsletter/subscription", {
    cookie,
    payload: CONSENT,
  });
  const response = await request(built, "POST", "/email-preferences/newsletter/confirm", {
    payload: { token: confirmationTokenFrom(built, email) },
  });
  expect(response.statusCode).toBe(200);
}

describe("GET /email-preferences", () => {
  it("requires a session", async () => {
    const built = build();

    const response = await request(built, "GET", "/email-preferences");

    expect(response.statusCode).toBe(401);
  });

  it("shows essential email as required and the newsletter off by default, uncached", async () => {
    const built = build();
    const { cookie } = await signIn(built);

    const response = await request(built, "GET", "/email-preferences", { cookie });

    expect(response.statusCode).toBe(200);
    expect(response.headers["cache-control"]).toBe("private, no-store");
    expect(response.json()).toEqual({
      essential: { enabled: true, required: true },
      newsletter: { status: "not_subscribed", since: null },
    });
  });

  it("registration alone never subscribes anyone", async () => {
    const built = build();
    await built.app.inject({
      method: "POST",
      url: "/auth/register",
      payload: { email: "new@example.com", password: "a-good-password-123" },
    });

    expect(built.newsletterRepository.records.size).toBe(0);
  });
});

describe("POST /email-preferences/newsletter/subscription (double opt-in, step 1)", () => {
  it("requires a session", async () => {
    const built = build();

    const response = await request(built, "POST", "/email-preferences/newsletter/subscription", {
      payload: CONSENT,
    });

    expect(response.statusCode).toBe(401);
  });

  it("records a pending request and sends a transactional confirmation email to the session's address", async () => {
    const built = build();
    const { cookie } = await signIn(built);

    const response = await request(built, "POST", "/email-preferences/newsletter/subscription", {
      cookie,
      payload: CONSENT,
    });

    expect(response.statusCode).toBe(202);
    expect(response.json()).toMatchObject({
      newsletter: { status: "pending" },
      confirmationEmailSent: true,
    });
    const email = built.emailProvider.findLastSentTo("ada@example.com");
    expect(email).toMatchObject({
      category: "transactional",
      template: "newsletter-confirmation",
      listUnsubscribeUrl: null,
    });
    expect(email!.links[0]).toMatch(/^https:\/\/app\.example\.com\/newsletter\/confirm\?token=/);
  });

  it.each([
    ["consent: false", { consent: false, consentVersion: NEWSLETTER_CONSENT_VERSION }],
    ["no consent field", { consentVersion: NEWSLETTER_CONSENT_VERSION }],
    ["a client-supplied address", { ...CONSENT, email: "victim@example.com" }],
  ])("rejects %s with 400 and sends nothing", async (_label, payload) => {
    const built = build();
    const { cookie } = await signIn(built);

    const response = await request(built, "POST", "/email-preferences/newsletter/subscription", {
      cookie,
      payload,
    });

    expect(response.statusCode).toBe(400);
    expect(built.emailProvider.all()).toHaveLength(0);
  });

  it("answers 409 for a consent given to an outdated consent text", async () => {
    const built = build();
    const { cookie } = await signIn(built);

    const response = await request(built, "POST", "/email-preferences/newsletter/subscription", {
      cookie,
      payload: { consent: true, consentVersion: "an-old-version" },
    });

    expect(response.statusCode).toBe(409);
    expect(built.newsletterRepository.records.size).toBe(0);
  });

  it("refuses a cross-origin request", async () => {
    const built = build();
    const { cookie } = await signIn(built);

    const response = await request(built, "POST", "/email-preferences/newsletter/subscription", {
      cookie,
      payload: CONSENT,
      headers: { origin: "https://evil.example.net" },
    });

    expect(response.statusCode).toBe(403);
  });

  it("answers 503 when the provider fails, keeping the request pending", async () => {
    const built = build();
    const { cookie, user } = await signIn(built);
    built.emailProvider.failNext(1);

    const response = await request(built, "POST", "/email-preferences/newsletter/subscription", {
      cookie,
      payload: CONSENT,
    });

    expect(response.statusCode).toBe(503);
    expect(JSON.stringify(response.json())).not.toMatch(/token|provider down/i);
    expect(built.newsletterRepository.records.get(user.id)?.status).toBe("pending");
  });

  it("answers 200 without sending anything for an already confirmed subscription", async () => {
    const built = build();
    const { cookie } = await signIn(built);
    await subscribeAndConfirm(built, cookie, "ada@example.com");
    const sent = built.emailProvider.all().length;

    const response = await request(built, "POST", "/email-preferences/newsletter/subscription", {
      cookie,
      payload: CONSENT,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      newsletter: { status: "subscribed" },
      confirmationEmailSent: false,
    });
    expect(built.emailProvider.all()).toHaveLength(sent);
  });

  it("is rate limited (5 per hour) against email bombing", async () => {
    const built = build();
    const { cookie } = await signIn(built);
    const statuses: number[] = [];
    for (let i = 0; i < 6; i += 1) {
      const response = await request(built, "POST", "/email-preferences/newsletter/subscription", {
        cookie,
        payload: CONSENT,
      });
      statuses.push(response.statusCode);
    }

    expect(statuses.slice(0, 5).every((s) => s !== 429)).toBe(true);
    expect(statuses[5]).toBe(429);
  });
});

describe("POST /email-preferences/newsletter/confirm (double opt-in, step 2)", () => {
  it("confirms with the emailed token, without a session", async () => {
    const built = build();
    const { cookie } = await signIn(built);
    await subscribeAndConfirm(built, cookie, "ada@example.com");

    const preferences = await request(built, "GET", "/email-preferences", { cookie });

    expect(preferences.json()).toMatchObject({ newsletter: { status: "subscribed" } });
  });

  it("rejects a reused token with 400 (single use)", async () => {
    const built = build();
    const { cookie } = await signIn(built);
    await subscribeAndConfirm(built, cookie, "ada@example.com");

    const response = await request(built, "POST", "/email-preferences/newsletter/confirm", {
      payload: { token: confirmationTokenFrom(built, "ada@example.com") },
    });

    expect(response.statusCode).toBe(400);
  });

  it("rejects an unknown token with 400 and a malformed body with 400", async () => {
    const built = build();

    const unknown = await request(built, "POST", "/email-preferences/newsletter/confirm", {
      payload: { token: "not-a-real-token" },
    });
    const malformed = await request(built, "POST", "/email-preferences/newsletter/confirm", {
      payload: { token: "" },
    });

    expect(unknown.statusCode).toBe(400);
    expect(malformed.statusCode).toBe(400);
  });

  it("rejects an expired token with 410", async () => {
    const built = build();
    const { cookie } = await signIn(built);
    await request(built, "POST", "/email-preferences/newsletter/subscription", {
      cookie,
      payload: CONSENT,
    });
    built.clock.advance(48 * 60 * 60 * 1000);

    const response = await request(built, "POST", "/email-preferences/newsletter/confirm", {
      payload: { token: confirmationTokenFrom(built, "ada@example.com") },
    });

    expect(response.statusCode).toBe(410);
  });
});

describe("DELETE /email-preferences/newsletter/subscription (signed-in unsubscribe)", () => {
  it("requires a session", async () => {
    const built = build();

    const response = await request(built, "DELETE", "/email-preferences/newsletter/subscription");

    expect(response.statusCode).toBe(401);
  });

  it("unsubscribes, idempotently", async () => {
    const built = build();
    const { cookie } = await signIn(built);
    await subscribeAndConfirm(built, cookie, "ada@example.com");

    const first = await request(built, "DELETE", "/email-preferences/newsletter/subscription", {
      cookie,
    });
    const second = await request(built, "DELETE", "/email-preferences/newsletter/subscription", {
      cookie,
    });

    expect(first.statusCode).toBe(200);
    expect(first.json()).toMatchObject({ newsletter: { status: "not_subscribed" } });
    expect(second.statusCode).toBe(200);
    expect(second.json()).toEqual(first.json());
  });

  it("only ever affects the session's own subscription", async () => {
    const built = build();
    const ada = await signIn(built, "ada@example.com");
    const bob = await signIn(built, "bob@example.com");
    await subscribeAndConfirm(built, ada.cookie, "ada@example.com");

    await request(built, "DELETE", "/email-preferences/newsletter/subscription", {
      cookie: bob.cookie,
    });

    expect(built.newsletterRepository.records.get(ada.user.id)?.status).toBe("subscribed");
  });
});

describe("POST /email-preferences/newsletter/unsubscribe (link and one-click, no login)", () => {
  async function subscribedToken(built: Built): Promise<string> {
    const { cookie, user } = await signIn(built);
    await subscribeAndConfirm(built, cookie, "ada@example.com");
    const key = built.newsletterRepository.records.get(user.id)!.unsubscribeKey;
    return built.unsubscribeTokens.encode(key);
  }

  it("unsubscribes with the token from a JSON body (the web page)", async () => {
    const built = build();
    const token = await subscribedToken(built);

    const response = await request(built, "POST", "/email-preferences/newsletter/unsubscribe", {
      payload: { token },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: "not_subscribed" });
    expect([...built.newsletterRepository.records.values()][0]!.status).toBe("unsubscribed");
  });

  it("supports RFC 8058 one-click: token in the URL, form body, no Origin", async () => {
    const built = build();
    const token = await subscribedToken(built);

    const response = await built.app.inject({
      method: "POST",
      url: `/email-preferences/newsletter/unsubscribe?token=${encodeURIComponent(token)}`,
      headers: { "content-type": "application/x-www-form-urlencoded" },
      payload: "List-Unsubscribe=One-Click",
    });

    expect(response.statusCode).toBe(200);
    expect([...built.newsletterRepository.records.values()][0]!.status).toBe("unsubscribed");
  });

  it("is idempotent for the same link", async () => {
    const built = build();
    const token = await subscribedToken(built);
    await request(built, "POST", "/email-preferences/newsletter/unsubscribe", {
      payload: { token },
    });

    const again = await request(built, "POST", "/email-preferences/newsletter/unsubscribe", {
      payload: { token },
    });

    expect(again.statusCode).toBe(200);
  });

  it("rejects a forged token or a missing token with 400, changing nothing", async () => {
    const built = build();
    const token = await subscribedToken(built);
    const forged = `${token.split(".")[0]!}.AAAA`;

    const forgedResponse = await request(
      built,
      "POST",
      "/email-preferences/newsletter/unsubscribe",
      { payload: { token: forged } },
    );
    const missing = await request(built, "POST", "/email-preferences/newsletter/unsubscribe", {
      payload: {},
    });

    expect(forgedResponse.statusCode).toBe(400);
    expect(missing.statusCode).toBe(400);
    expect([...built.newsletterRepository.records.values()][0]!.status).toBe("subscribed");
  });

  it("does not accept form bodies on other routes", async () => {
    const built = build();

    const response = await built.app.inject({
      method: "POST",
      url: "/auth/login",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      payload: "email=a%40example.com&password=x",
    });

    expect(response.statusCode).toBe(415);
  });
});

describe("email failure and enumeration protection on the identity routes (M14)", () => {
  it("registration still answers 200 with the generic message when the provider fails", async () => {
    const built = build();
    built.emailProvider.failNext(1);

    const response = await built.app.inject({
      method: "POST",
      url: "/auth/register",
      payload: { email: "new@example.com", password: "a-good-password-123" },
    });

    expect(response.statusCode).toBe(200);
    expect(built.userRepository.users).toHaveLength(1);
  });

  it("forgot-password answers identically for known and unknown addresses, even when the provider fails", async () => {
    const built = build();
    await signIn(built, "known@example.com");
    const unknown = await built.app.inject({
      method: "POST",
      url: "/auth/password-reset/request",
      payload: { email: "unknown@example.com" },
    });
    built.emailProvider.failNext(1);

    const known = await built.app.inject({
      method: "POST",
      url: "/auth/password-reset/request",
      payload: { email: "known@example.com" },
    });

    expect(known.statusCode).toBe(unknown.statusCode);
    expect(known.body).toBe(unknown.body);
  });

  it("sends the reset email through the transactional template with an app link", async () => {
    const built = build();
    await signIn(built, "known@example.com");

    await built.app.inject({
      method: "POST",
      url: "/auth/password-reset/request",
      payload: { email: "known@example.com" },
    });

    const email = built.emailProvider.findLastSentTo("known@example.com", "password-reset");
    expect(email?.category).toBe("transactional");
    expect(email?.links[0]).toMatch(/^https:\/\/app\.example\.com\/reset-password\?token=/);
  });
});
