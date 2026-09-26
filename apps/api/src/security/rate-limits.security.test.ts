import type { FastifyInstance } from "fastify";
import { afterEach, describe, expect, it } from "vitest";

import { SESSION_COOKIE_NAME } from "../constants/session-cookie.js";
import { buildTestServer } from "../test-support/build-test-server.js";

/**
 * M16 (audit S-02, S-03, S-04, S-14): limits that hold per account/user, not only per client
 * address. `TRUST_PROXY=127.0.0.1` (inject's own address) lets each request claim a different
 * client address through X-Forwarded-For — exactly what a distributed attacker has.
 */

const PASSWORD = "correct-password";

let app: FastifyInstance | undefined;

afterEach(async () => {
  await app?.close();
  app = undefined;
});

function build() {
  const built = buildTestServer({ TRUST_PROXY: "127.0.0.1" });
  app = built.app;
  return { app: built.app, ...built.testDeps };
}

type Built = ReturnType<typeof build>;

let addressCounter = 0;
/** A fresh documentation-range client address for every call. */
function freshAddress(): string {
  addressCounter += 1;
  return `198.51.${String(Math.floor(addressCounter / 250))}.${String(addressCounter % 250)}`;
}

async function signIn(built: Built, email: string) {
  const user = built.userRepository.seed("STUDENT", {
    email,
    normalizedEmail: email,
    passwordHash: await built.passwordHasher.hash(PASSWORD),
    emailVerified: true,
  });
  const response = await built.app.inject({
    method: "POST",
    url: "/auth/login",
    headers: { "x-forwarded-for": freshAddress() },
    payload: { email, password: PASSWORD },
  });
  const cookie = response.cookies.find((c) => c.name === SESSION_COOKIE_NAME)?.value;
  if (!cookie) {
    throw new Error("test setup failed: no session cookie");
  }
  return { user, cookie };
}

function login(built: Built, email: string, password = "wrong-password") {
  return built.app.inject({
    method: "POST",
    url: "/auth/login",
    headers: { "x-forwarded-for": freshAddress() },
    payload: { email, password },
  });
}

async function exhaust(times: number, send: () => Promise<{ statusCode: number }>) {
  for (let i = 0; i < times; i += 1) {
    const response = await send();
    expect(response.statusCode).not.toBe(429);
  }
}

describe("login: per-account limit (S-02)", () => {
  it("stops a distributed guess at one account after 10 attempts in 15 minutes, whatever the address", async () => {
    const built = build();
    await exhaust(10, () => login(built, "victim@example.com"));

    const response = await login(built, "victim@example.com");

    expect(response.statusCode).toBe(429);
    expect(response.json()).toEqual({ error: "Too many requests." });
  });

  it("counts the same account however its address is spelled (case, surrounding spaces)", async () => {
    const built = build();
    await exhaust(10, () => login(built, "victim@example.com"));

    const response = await login(built, "  VICTIM@Example.com ");

    expect(response.statusCode).toBe(429);
  });

  it("leaves other accounts unaffected", async () => {
    const built = build();
    await exhaust(10, () => login(built, "victim@example.com"));

    const response = await login(built, "someone-else@example.com");

    expect(response.statusCode).toBe(401);
  });

  it("limits unknown addresses exactly like existing ones, so the limit reveals nothing", async () => {
    const built = build();
    await signIn(built, "exists@example.com");
    await exhaust(9, () => login(built, "exists@example.com"));
    await exhaust(10, () => login(built, "does-not-exist@example.com"));

    expect((await login(built, "exists@example.com")).statusCode).toBe(429);
    expect((await login(built, "does-not-exist@example.com")).statusCode).toBe(429);
  });

  it("leaves a body without an email to the route (400): malformed requests never share one account counter", async () => {
    const built = build();
    const malformed = () =>
      built.app.inject({
        method: "POST",
        url: "/auth/login",
        headers: { "x-forwarded-for": freshAddress() },
        payload: { password: "wrong-password" },
      });

    for (let i = 0; i < 12; i += 1) {
      expect((await malformed()).statusCode).toBe(400);
    }
    expect((await login(built, "someone@example.com")).statusCode).toBe(401);
  });

  it("still lets the owner of a throttled account request a password reset (lockout-DoS escape)", async () => {
    const built = build();
    await exhaust(10, () => login(built, "victim@example.com"));

    const response = await built.app.inject({
      method: "POST",
      url: "/auth/password-reset/request",
      headers: { "x-forwarded-for": freshAddress() },
      payload: { email: "victim@example.com" },
    });

    expect(response.statusCode).toBe(200);
  });
});

describe("per-user limits on sensitive and expensive routes (S-03, S-04)", () => {
  const cases = [
    {
      name: "account deletion (a password check)",
      max: 5,
      request: { method: "POST", url: "/data-management/account-deletion" },
      payload: { password: "a-wrong-guess", confirm: true },
    },
    {
      name: "the personal-data export",
      max: 5,
      request: { method: "GET", url: "/data-management/export" },
      payload: undefined,
    },
    {
      name: "audio generation",
      max: 30,
      request: { method: "POST", url: "/audio-generations" },
      payload: {},
    },
    {
      name: "video generation",
      max: 10,
      request: { method: "POST", url: "/video-generations" },
      payload: {},
    },
  ] as const;

  it.each(cases)(
    "limits $name per user ($max per hour) even from a new address every time",
    async ({ max, request, payload }) => {
      const built = build();
      const { cookie } = await signIn(built, "ada@example.com");
      const send = () =>
        built.app.inject({
          ...request,
          headers: { "x-forwarded-for": freshAddress() },
          cookies: { [SESSION_COOKIE_NAME]: cookie },
          ...(payload === undefined ? {} : { payload }),
        });
      await exhaust(max, send);

      const limited = await send();

      expect(limited.statusCode).toBe(429);
    },
  );

  it("keeps each user's budget separate", async () => {
    const built = build();
    const ada = await signIn(built, "ada@example.com");
    const grace = await signIn(built, "grace@example.com");
    const deletion = (cookie: string) =>
      built.app.inject({
        method: "POST",
        url: "/data-management/account-deletion",
        headers: { "x-forwarded-for": freshAddress() },
        cookies: { [SESSION_COOKIE_NAME]: cookie },
        payload: { password: "a-wrong-guess", confirm: true },
      });
    await exhaust(5, () => deletion(ada.cookie));

    expect((await deletion(ada.cookie)).statusCode).toBe(429);
    expect((await deletion(grace.cookie)).statusCode).toBe(403);
  });
});

describe("profile routes are rate limited per client (S-14)", () => {
  it("limits profile reads to 120 a minute", async () => {
    const built = buildTestServer();
    app = built.app;
    const read = () => built.app.inject({ method: "GET", url: "/profile" });
    await exhaust(120, read);

    expect((await read()).statusCode).toBe(429);
  });

  it("limits profile updates to 30 a minute", async () => {
    const built = buildTestServer();
    app = built.app;
    const update = () =>
      built.app.inject({ method: "PATCH", url: "/profile", payload: { name: "Ada" } });
    await exhaust(30, update);

    expect((await update()).statusCode).toBe(429);
  });
});
