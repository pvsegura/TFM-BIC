import { loadEnv } from "@tfm-bic/config";
import type { FastifyInstance } from "fastify";
import { afterEach, describe, expect, it } from "vitest";

import { buildServer } from "../server.js";
import { buildTestDeps } from "../test-support/build-test-deps.js";
import { SESSION_COOKIE_NAME } from "../constants/session-cookie.js";

const APP_BASE_URL = "https://app.example.com";

let app: FastifyInstance | undefined;

afterEach(async () => {
  await app?.close();
  app = undefined;
});

function build(testDeps = buildTestDeps()) {
  app = buildServer(
    loadEnv({ NODE_ENV: "test", APP_BASE_URL, AUTH_SESSION_SECRET: "test-secret-value" }),
    testDeps.deps,
    testDeps.profileDeps,
    testDeps.contentDeps,
  );
  return { app, ...testDeps };
}

function sessionCookieFrom(response: { cookies: { name: string; value: string }[] }) {
  return response.cookies.find((c) => c.name === SESSION_COOKIE_NAME)?.value;
}

describe("POST /auth/register", () => {
  it("returns a generic success message for a new registration", async () => {
    const { app } = build();

    const response = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: { email: "new@example.com", password: "a-good-password" },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json<{ message: string }>().message).toMatch(/verification/i);
  });

  it("creates exactly one STUDENT user, unverified", async () => {
    const { app, userRepository } = build();

    await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: { email: "new@example.com", password: "a-good-password" },
    });

    expect(userRepository.users).toHaveLength(1);
    expect(userRepository.users[0]).toMatchObject({ role: "STUDENT", emailVerified: false });
  });

  it("returns the identical response for a duplicate email (no account enumeration)", async () => {
    const { app, userRepository } = build();
    const payload = { email: "dup@example.com", password: "a-good-password" };

    const first = await app.inject({ method: "POST", url: "/auth/register", payload });
    const second = await app.inject({ method: "POST", url: "/auth/register", payload });

    expect(second.statusCode).toBe(first.statusCode);
    expect(second.json()).toEqual(first.json());
    expect(userRepository.users).toHaveLength(1);
  });

  it("rejects an invalid email with 400", async () => {
    const { app } = build();

    const response = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: { email: "not-an-email", password: "a-good-password" },
    });

    expect(response.statusCode).toBe(400);
  });

  it("rejects a too-short password with 400", async () => {
    const { app } = build();

    const response = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: { email: "user@example.com", password: "short" },
    });

    expect(response.statusCode).toBe(400);
  });

  it("rejects a client-supplied role field with 400 (self-assigned-privilege guard)", async () => {
    const { app } = build();

    const response = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: { email: "user@example.com", password: "a-good-password", role: "TEACHER" },
    });

    expect(response.statusCode).toBe(400);
  });

  it("safely accepts an XSS-payload-shaped password without crashing (treated as an opaque string)", async () => {
    const { app } = build();

    const response = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: { email: "user@example.com", password: "<script>alert(1)</script>zz" },
    });

    expect(response.statusCode).toBe(200);
  });

  it("rejects a mismatched Origin header (CSRF defense in depth)", async () => {
    const { app } = build();

    const response = await app.inject({
      method: "POST",
      url: "/auth/register",
      headers: { origin: "https://evil.example.com" },
      payload: { email: "user@example.com", password: "a-good-password" },
    });

    expect(response.statusCode).toBe(403);
  });

  it("is rate limited", async () => {
    const { app } = build();

    let lastResponse;
    for (let i = 0; i < 6; i += 1) {
      lastResponse = await app.inject({
        method: "POST",
        url: "/auth/register",
        payload: { email: `user${i}@example.com`, password: "a-good-password" },
      });
    }

    expect(lastResponse?.statusCode).toBe(429);
  });
});

describe("POST /auth/login", () => {
  async function seedVerifiedUser(deps: ReturnType<typeof buildTestDeps>) {
    const passwordHash = await deps.passwordHasher.hash("correct-password");
    return deps.userRepository.seed("STUDENT", {
      email: "user@example.com",
      normalizedEmail: "user@example.com",
      passwordHash,
      emailVerified: true,
    });
  }

  it("logs in with correct credentials and sets a secure session cookie", async () => {
    const testDeps = buildTestDeps();
    await seedVerifiedUser(testDeps);
    const { app } = build(testDeps);

    const response = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email: "user@example.com", password: "correct-password" },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).not.toHaveProperty("passwordHash");
    const cookie = response.cookies.find((c) => c.name === SESSION_COOKIE_NAME);
    expect(cookie).toBeDefined();
    expect(cookie?.httpOnly).toBe(true);
    expect(cookie?.sameSite).toBe("Strict");
    expect(cookie?.path).toBe("/");
  });

  it("rejects a wrong password with a generic 401 message", async () => {
    const testDeps = buildTestDeps();
    await seedVerifiedUser(testDeps);
    const { app } = build(testDeps);

    const response = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email: "user@example.com", password: "wrong-password" },
    });

    expect(response.statusCode).toBe(401);
    expect(response.json<{ error: string }>().error).toMatch(/invalid email or password/i);
  });

  it("rejects a nonexistent account with the identical generic 401 message", async () => {
    const testDeps = buildTestDeps();
    await seedVerifiedUser(testDeps);
    const { app } = build(testDeps);

    const wrongPassword = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email: "user@example.com", password: "wrong-password" },
    });
    const noSuchAccount = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email: "nobody@example.com", password: "whatever" },
    });

    expect(noSuchAccount.statusCode).toBe(wrongPassword.statusCode);
    expect(noSuchAccount.json()).toEqual(wrongPassword.json());
  });

  it("allows an unverified user to log in (M3 decision: login is not gated on verification)", async () => {
    const testDeps = buildTestDeps();
    const passwordHash = await testDeps.passwordHasher.hash("correct-password");
    testDeps.userRepository.seed("STUDENT", {
      email: "unverified@example.com",
      normalizedEmail: "unverified@example.com",
      passwordHash,
      emailVerified: false,
    });
    const { app } = build(testDeps);

    const response = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email: "unverified@example.com", password: "correct-password" },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json<{ emailVerified: boolean }>().emailVerified).toBe(false);
  });
});

describe("GET /auth/me and POST /auth/logout", () => {
  async function loginAndGetCookie() {
    const testDeps = buildTestDeps();
    const passwordHash = await testDeps.passwordHasher.hash("correct-password");
    testDeps.userRepository.seed("STUDENT", {
      email: "user@example.com",
      normalizedEmail: "user@example.com",
      passwordHash,
      emailVerified: true,
    });
    const { app } = build(testDeps);
    const loginResponse = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email: "user@example.com", password: "correct-password" },
    });
    const cookie = sessionCookieFrom(loginResponse);
    if (!cookie) throw new Error("test setup failed: no session cookie");
    return { app, cookie, testDeps };
  }

  it("returns the current user when authenticated", async () => {
    const { app, cookie } = await loginAndGetCookie();

    const response = await app.inject({
      method: "GET",
      url: "/auth/me",
      cookies: { [SESSION_COOKIE_NAME]: cookie },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ email: "user@example.com", role: "STUDENT" });
  });

  it("returns 401 with no session cookie", async () => {
    const { app } = build();

    const response = await app.inject({ method: "GET", url: "/auth/me" });

    expect(response.statusCode).toBe(401);
  });

  it("returns 401 for a tampered cookie value", async () => {
    const { app, cookie } = await loginAndGetCookie();

    const response = await app.inject({
      method: "GET",
      url: "/auth/me",
      cookies: { [SESSION_COOKIE_NAME]: `${cookie}tampered` },
    });

    expect(response.statusCode).toBe(401);
  });

  it("logout invalidates the session — a subsequent /auth/me with the same cookie is 401", async () => {
    const { app, cookie } = await loginAndGetCookie();

    const logoutResponse = await app.inject({
      method: "POST",
      url: "/auth/logout",
      cookies: { [SESSION_COOKIE_NAME]: cookie },
    });
    const meAfterLogout = await app.inject({
      method: "GET",
      url: "/auth/me",
      cookies: { [SESSION_COOKIE_NAME]: cookie },
    });

    expect(logoutResponse.statusCode).toBe(204);
    expect(meAfterLogout.statusCode).toBe(401);
  });

  it("logout is safe with no session at all", async () => {
    const { app } = build();

    const response = await app.inject({ method: "POST", url: "/auth/logout" });

    expect(response.statusCode).toBe(204);
  });
});

describe("POST /auth/email-verification/confirm", () => {
  it("verifies the user's email with a valid token", async () => {
    const testDeps = buildTestDeps();
    const user = testDeps.userRepository.seed("STUDENT", { emailVerified: false });
    await testDeps.emailVerificationTokenRepository.create({
      userId: user.id,
      tokenHash: testDeps.tokenGenerator.hash("raw-verification-token"),
      expiresAt: new Date("2099-01-01"),
    });
    const { app } = build(testDeps);

    const response = await app.inject({
      method: "POST",
      url: "/auth/email-verification/confirm",
      payload: { token: "raw-verification-token" },
    });

    expect(response.statusCode).toBe(200);
    expect((await testDeps.userRepository.findById(user.id))?.emailVerified).toBe(true);
  });

  it("rejects an unknown token with 400", async () => {
    const { app } = build();

    const response = await app.inject({
      method: "POST",
      url: "/auth/email-verification/confirm",
      payload: { token: "never-issued" },
    });

    expect(response.statusCode).toBe(400);
  });

  it("rejects a reused token on the second attempt", async () => {
    const testDeps = buildTestDeps();
    const user = testDeps.userRepository.seed("STUDENT", { emailVerified: false });
    await testDeps.emailVerificationTokenRepository.create({
      userId: user.id,
      tokenHash: testDeps.tokenGenerator.hash("raw-verification-token"),
      expiresAt: new Date("2099-01-01"),
    });
    const { app } = build(testDeps);

    await app.inject({
      method: "POST",
      url: "/auth/email-verification/confirm",
      payload: { token: "raw-verification-token" },
    });
    const second = await app.inject({
      method: "POST",
      url: "/auth/email-verification/confirm",
      payload: { token: "raw-verification-token" },
    });

    expect(second.statusCode).toBe(400);
    expect(second.json<{ error: string }>().error).toMatch(/already been used/i);
  });

  it("rejects an expired token", async () => {
    const testDeps = buildTestDeps(new Date("2026-01-10T00:00:00.000Z"));
    const user = testDeps.userRepository.seed("STUDENT", { emailVerified: false });
    await testDeps.emailVerificationTokenRepository.create({
      userId: user.id,
      tokenHash: testDeps.tokenGenerator.hash("raw-verification-token"),
      expiresAt: new Date("2026-01-01T00:00:00.000Z"),
    });
    const { app } = build(testDeps);

    const response = await app.inject({
      method: "POST",
      url: "/auth/email-verification/confirm",
      payload: { token: "raw-verification-token" },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json<{ error: string }>().error).toMatch(/expired/i);
  });
});

describe("POST /auth/email-verification/resend", () => {
  it("returns a generic response regardless of account existence (no enumeration)", async () => {
    const { app } = build();

    const forExisting = await app.inject({
      method: "POST",
      url: "/auth/email-verification/resend",
      payload: { email: "user@example.com" },
    });
    const forNobody = await app.inject({
      method: "POST",
      url: "/auth/email-verification/resend",
      payload: { email: "nobody@example.com" },
    });

    expect(forExisting.statusCode).toBe(200);
    expect(forNobody.statusCode).toBe(200);
    expect(forExisting.json()).toEqual(forNobody.json());
  });
});

describe("POST /auth/password-reset/request and /auth/password-reset/confirm", () => {
  it("request returns a generic response regardless of account existence", async () => {
    const { app } = build();

    const response = await app.inject({
      method: "POST",
      url: "/auth/password-reset/request",
      payload: { email: "nobody@example.com" },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json<{ message: string }>().message).toBeTruthy();
  });

  it("confirm updates the password and revokes existing sessions", async () => {
    const testDeps = buildTestDeps();
    const oldPasswordHash = await testDeps.passwordHasher.hash("old-password");
    const user = testDeps.userRepository.seed("STUDENT", {
      email: "user@example.com",
      normalizedEmail: "user@example.com",
      passwordHash: oldPasswordHash,
      emailVerified: true,
    });
    const { app } = build(testDeps);

    const loginResponse = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email: "user@example.com", password: "old-password" },
    });
    const oldCookie = sessionCookieFrom(loginResponse);
    if (!oldCookie) throw new Error("test setup failed: no session cookie");

    await testDeps.passwordResetTokenRepository.create({
      userId: user.id,
      tokenHash: testDeps.tokenGenerator.hash("raw-reset-token"),
      expiresAt: new Date("2099-01-01"),
    });

    const confirmResponse = await app.inject({
      method: "POST",
      url: "/auth/password-reset/confirm",
      payload: { token: "raw-reset-token", newPassword: "a-new-good-password" },
    });
    const meWithOldCookie = await app.inject({
      method: "GET",
      url: "/auth/me",
      cookies: { [SESSION_COOKIE_NAME]: oldCookie },
    });
    const loginWithNewPassword = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email: "user@example.com", password: "a-new-good-password" },
    });

    expect(confirmResponse.statusCode).toBe(200);
    expect(meWithOldCookie.statusCode).toBe(401);
    expect(loginWithNewPassword.statusCode).toBe(200);
  });

  it("rejects a too-short new password with 400", async () => {
    const { app } = build();

    const response = await app.inject({
      method: "POST",
      url: "/auth/password-reset/confirm",
      payload: { token: "some-token", newPassword: "short" },
    });

    expect(response.statusCode).toBe(400);
  });
});
