import { makePersonalDataRecords } from "@tfm-bic/application/testing";
import { loadEnv } from "@tfm-bic/config";
import { personalDataExportSchema } from "@tfm-bic/contracts";
import { NEWSLETTER_CONSENT_VERSION } from "@tfm-bic/domain";
import type { FastifyInstance } from "fastify";
import { afterEach, describe, expect, it } from "vitest";

import { SESSION_COOKIE_NAME } from "../constants/session-cookie.js";
import { buildServer } from "../server.js";
import { buildTestDeps } from "../test-support/build-test-deps.js";

const APP_BASE_URL = "https://app.example.com";
const PASSWORD = "correct-password";
const EXPORT_URL = "/data-management/export";
const DELETION_URL = "/data-management/account-deletion";

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
    testDeps.privacyDeps,
  );
  return { app, ...testDeps };
}

type Built = ReturnType<typeof build>;

/** A verified account with a session, and its export records seeded. */
async function signIn(built: Built, email = "ada@example.com") {
  const user = built.userRepository.seed("STUDENT", {
    email,
    normalizedEmail: email,
    passwordHash: await built.passwordHasher.hash(PASSWORD),
    emailVerified: true,
  });
  const base = makePersonalDataRecords(user.id);
  built.personalDataReadModel.seed({ ...base, account: { ...base.account, email } });
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

function exportRequest(built: Built, cookie?: string, url = EXPORT_URL) {
  return built.app.inject({
    method: "GET",
    url,
    ...(cookie ? { cookies: { [SESSION_COOKIE_NAME]: cookie } } : {}),
  });
}

function deletionRequest(
  built: Built,
  options: { cookie?: string; payload?: unknown; origin?: string } = {},
) {
  return built.app.inject({
    method: "POST",
    url: DELETION_URL,
    payload: options.payload ?? { password: PASSWORD, confirm: true },
    headers: options.origin ? { origin: options.origin } : {},
    ...(options.cookie ? { cookies: { [SESSION_COOKIE_NAME]: options.cookie } } : {}),
  });
}

describe("GET /data-management/export", () => {
  it("requires a session", async () => {
    const built = build();

    const response = await exportRequest(built);

    expect(response.statusCode).toBe(401);
    expect(built.personalDataReadModel.requestedUserIds).toEqual([]);
  });

  it("returns the session user's export as an uncached JSON attachment", async () => {
    const built = build();
    const { user, cookie } = await signIn(built);

    const response = await exportRequest(built, cookie);
    const body = personalDataExportSchema.parse(response.json());

    expect(response.statusCode).toBe(200);
    expect(body.account.userId).toBe(user.id);
    expect(body.account.email).toBe("ada@example.com");
    expect(response.headers["cache-control"]).toBe("private, no-store");
    expect(response.headers["x-content-type-options"]).toBe("nosniff");
    expect(response.headers["content-type"]).toMatch(/^application\/json/);
    // The file name carries the date only — never the user id or email address.
    expect(response.headers["content-disposition"]).toBe(
      'attachment; filename="tfm-bic-personal-data-2026-01-01.json"',
    );
    expect(built.personalDataReadModel.requestedUserIds).toEqual([user.id]);
  });

  it("user A cannot export user B: a user id in the query is refused, and only A is ever read", async () => {
    const built = build();
    const ben = await signIn(built, "ben@example.com");
    const ana = await signIn(built, "ana@example.com");

    const withQuery = await exportRequest(built, ana.cookie, `${EXPORT_URL}?userId=${ben.user.id}`);
    const plain = await exportRequest(built, ana.cookie);

    expect(withQuery.statusCode).toBe(400);
    expect(plain.statusCode).toBe(200);
    expect(built.personalDataReadModel.requestedUserIds).toEqual([ana.user.id]);
    expect(plain.body).not.toContain("ben@example.com");
    expect(plain.body).not.toContain(ben.user.id);
  });

  it("never returns a secret: no password hash, no session cookie, no token", async () => {
    const built = build();
    const { cookie } = await signIn(built);

    const response = await exportRequest(built, cookie);

    expect(response.statusCode).toBe(200);
    for (const secret of [
      PASSWORD,
      "hashed:",
      cookie,
      "passwordHash",
      "tokenHash",
      "unsubscribeKey",
    ]) {
      expect(response.body).not.toContain(secret);
    }
  });

  it("answers 404 when the account vanished between authentication and export", async () => {
    const built = build();
    const { user, cookie } = await signIn(built);
    built.personalDataReadModel.records.delete(user.id);

    const response = await exportRequest(built, cookie);

    expect(response.statusCode).toBe(404);
    expect(response.headers["cache-control"]).toBe("private, no-store");
  });

  it("is rate limited to 5 exports an hour", async () => {
    const built = build();
    const { cookie } = await signIn(built);

    const statuses: number[] = [];
    for (let i = 0; i < 6; i += 1) {
      statuses.push((await exportRequest(built, cookie)).statusCode);
    }

    expect(statuses.slice(0, 5)).toEqual([200, 200, 200, 200, 200]);
    expect(statuses[5]).toBe(429);
  });
});

describe("POST /data-management/account-deletion", () => {
  it("requires a session", async () => {
    const built = build();

    const response = await deletionRequest(built);

    expect(response.statusCode).toBe(401);
    expect(built.erasureStore.erasedUserIds).toEqual([]);
  });

  it("refuses a cross-origin request before touching the account", async () => {
    const built = build();
    const { cookie } = await signIn(built);

    const response = await deletionRequest(built, { cookie, origin: "https://evil.example" });

    expect(response.statusCode).toBe(403);
    expect(built.erasureStore.erasedUserIds).toEqual([]);
  });

  it.each([
    ["no confirmation", { password: PASSWORD }],
    ["confirm: false", { password: PASSWORD, confirm: false }],
    ["no password", { confirm: true }],
    ["a user id", { password: PASSWORD, confirm: true, userId: "someone-else" }],
  ])("refuses a body with %s", async (_label, payload) => {
    const built = build();
    const { cookie } = await signIn(built);

    const response = await deletionRequest(built, { cookie, payload });

    expect(response.statusCode).toBe(400);
    expect(built.erasureStore.erasedUserIds).toEqual([]);
  });

  it("refuses a wrong password and keeps the account and its session", async () => {
    const built = build();
    const { user, cookie } = await signIn(built);

    const response = await deletionRequest(built, {
      cookie,
      payload: { password: "wrong-password", confirm: true },
    });

    expect(response.statusCode).toBe(403);
    expect(response.json()).toEqual({ error: "The password is incorrect." });
    expect(await built.userRepository.findById(user.id)).not.toBeNull();
    const me = await built.app.inject({
      method: "GET",
      url: "/auth/me",
      cookies: { [SESSION_COOKIE_NAME]: cookie },
    });
    expect(me.statusCode).toBe(200);
  });

  it("deletes the session user's account, clears the cookie and invalidates the session", async () => {
    const built = build();
    const ben = await signIn(built, "ben@example.com");
    const ana = await signIn(built, "ana@example.com");
    await built.newsletterRepository.save({
      userId: ana.user.id,
      status: "subscribed",
      unsubscribeKey: "k",
      consentVersion: NEWSLETTER_CONSENT_VERSION,
      consentSource: "settings",
      requestedAt: new Date(),
      confirmedAt: new Date(),
      unsubscribedAt: null,
      confirmationTokenHash: null,
      confirmationExpiresAt: null,
      confirmationSentAt: null,
    });

    const response = await deletionRequest(built, { cookie: ana.cookie });

    expect(response.statusCode).toBe(204);
    expect(response.headers["cache-control"]).toBe("private, no-store");
    const cleared = response.cookies.find((c) => c.name === SESSION_COOKIE_NAME);
    expect(cleared?.value).toBe("");
    expect(built.erasureStore.erasedUserIds).toEqual([ana.user.id]);
    expect(await built.userRepository.findById(ana.user.id)).toBeNull();
    expect(built.newsletterRepository.records.has(ana.user.id)).toBe(false);

    const me = await built.app.inject({
      method: "GET",
      url: "/auth/me",
      cookies: { [SESSION_COOKIE_NAME]: ana.cookie },
    });
    expect(me.statusCode).toBe(401);
    const exportAfter = await exportRequest(built, ana.cookie);
    expect(exportAfter.statusCode).toBe(401);

    // User A cannot have deleted user B.
    expect(await built.userRepository.findById(ben.user.id)).not.toBeNull();
    const benMe = await built.app.inject({
      method: "GET",
      url: "/auth/me",
      cookies: { [SESSION_COOKIE_NAME]: ben.cookie },
    });
    expect(benMe.statusCode).toBe(200);
  });

  it("a repeated request after deletion is refused as unauthenticated and erases nothing more", async () => {
    const built = build();
    const { cookie } = await signIn(built);
    await deletionRequest(built, { cookie });

    const again = await deletionRequest(built, { cookie });

    expect(again.statusCode).toBe(401);
    expect(built.erasureStore.erasedUserIds).toHaveLength(1);
  });

  it("is rate limited to 5 attempts an hour (password guessing)", async () => {
    const built = build();
    const { cookie } = await signIn(built);

    const statuses: number[] = [];
    for (let i = 0; i < 6; i += 1) {
      statuses.push(
        (await deletionRequest(built, { cookie, payload: { password: "guess", confirm: true } }))
          .statusCode,
      );
    }

    expect(statuses.slice(0, 5)).toEqual([403, 403, 403, 403, 403]);
    expect(statuses[5]).toBe(429);
  });
});
