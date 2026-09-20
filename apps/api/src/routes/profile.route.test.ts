import { loadEnv } from "@tfm-bic/config";
import type { ProfileResponse, ProfileValidationErrorResponse } from "@tfm-bic/contracts";
import type { FastifyInstance } from "fastify";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SESSION_COOKIE_NAME } from "../constants/session-cookie.js";
import { buildServer } from "../server.js";
import { buildTestDeps } from "../test-support/build-test-deps.js";

const APP_BASE_URL = "https://app.example.com";
const PASSWORD = "correct-password";

let app: FastifyInstance | undefined;

afterEach(async () => {
  await app?.close();
  app = undefined;
});

function build() {
  const testDeps = buildTestDeps();
  app = buildServer(
    loadEnv({ NODE_ENV: "test", APP_BASE_URL, AUTH_SESSION_SECRET: "test-secret-value" }),
    testDeps.deps,
    testDeps.profileDeps,
  );
  return { app, ...testDeps };
}

type Built = ReturnType<typeof build>;

/** Seeds a verified user and logs them in through the real /auth/login
 * route, returning the signed session cookie a browser would hold. */
async function signIn(built: Built, email: string, role: "STUDENT" | "TEACHER" = "STUDENT") {
  const user = built.userRepository.seed(role, {
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

function getProfile(built: Built, cookie?: string, url = "/profile") {
  return built.app.inject({
    method: "GET",
    url,
    ...(cookie ? { cookies: { [SESSION_COOKIE_NAME]: cookie } } : {}),
  });
}

function patchProfile(
  built: Built,
  cookie: string | undefined,
  payload: unknown,
  headers: Record<string, string> = {},
) {
  return built.app.inject({
    method: "PATCH",
    url: "/profile",
    payload: payload as object,
    headers,
    ...(cookie ? { cookies: { [SESSION_COOKIE_NAME]: cookie } } : {}),
  });
}

describe("GET /profile", () => {
  it("returns 401 without a session cookie", async () => {
    const built = build();
    await signIn(built, "ana@example.com");

    const response = await getProfile(built);

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({ error: "Unauthenticated" });
  });

  it("returns 401 for a tampered cookie", async () => {
    const built = build();
    const { cookie } = await signIn(built, "ana@example.com");

    const response = await getProfile(built, `${cookie}tampered`);

    expect(response.statusCode).toBe(401);
  });

  it("returns 401 once the session has been logged out", async () => {
    const built = build();
    const { cookie } = await signIn(built, "ana@example.com");
    await built.app.inject({
      method: "POST",
      url: "/auth/logout",
      cookies: { [SESSION_COOKIE_NAME]: cookie },
    });

    const response = await getProfile(built, cookie);

    expect(response.statusCode).toBe(401);
  });

  it("returns an empty profile with the account email and role when nothing is saved yet", async () => {
    const built = build();
    const { user, cookie } = await signIn(built, "ana@example.com");

    const response = await getProfile(built, cookie);

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      userId: user.id,
      firstName: null,
      lastName: null,
      nickname: null,
      avatarId: null,
      email: "ana@example.com",
      role: "STUDENT",
    });
  });

  it("returns the saved profile", async () => {
    const built = build();
    const { user, cookie } = await signIn(built, "ana@example.com");
    await built.profileRepository.upsert(user.id, {
      firstName: "Łukasz",
      lastName: "Kowalski",
      nickname: "lukas",
      avatarId: "avatar-02",
    });

    const response = await getProfile(built, cookie);

    expect(response.json()).toEqual({
      userId: user.id,
      firstName: "Łukasz",
      lastName: "Kowalski",
      nickname: "lukas",
      avatarId: "avatar-02",
      email: "ana@example.com",
      role: "STUDENT",
    });
  });

  it("takes email and role from the authentication identity, not the profile", async () => {
    const built = build();
    const { cookie } = await signIn(built, "teacher@example.com", "TEACHER");

    const response = await getProfile(built, cookie);

    expect(response.json<ProfileResponse>()).toMatchObject({
      email: "teacher@example.com",
      role: "TEACHER",
    });
  });

  it("exposes only the documented fields — no hashes, tokens or internals", async () => {
    const built = build();
    const { user, cookie } = await signIn(built, "ana@example.com");
    await built.profileRepository.upsert(user.id, { firstName: "Ana" });

    const response = await getProfile(built, cookie);

    expect(Object.keys(response.json<object>()).sort()).toEqual(
      ["avatarId", "email", "firstName", "lastName", "nickname", "role", "userId"].sort(),
    );
    expect(response.body).not.toMatch(/password|hash|token|createdAt|updatedAt/i);
  });

  it("never reads a user id from the query string", async () => {
    const built = build();
    const { cookie } = await signIn(built, "ana@example.com");
    const other = await signIn(built, "bea@example.com");
    await built.profileRepository.upsert(other.user.id, { firstName: "Bea" });

    const response = await getProfile(built, cookie, `/profile?userId=${other.user.id}`);

    expect(response.json<ProfileResponse>().firstName).toBeNull();
  });

  it("has no per-user URL — /profile/:id does not exist", async () => {
    const built = build();
    const { cookie } = await signIn(built, "ana@example.com");
    const other = await signIn(built, "bea@example.com");

    const response = await getProfile(built, cookie, `/profile/${other.user.id}`);

    expect(response.statusCode).toBe(404);
  });

  it("only ever returns the caller's own profile", async () => {
    const built = build();
    const ana = await signIn(built, "ana@example.com");
    const bea = await signIn(built, "bea@example.com");
    await built.profileRepository.upsert(ana.user.id, { firstName: "Ana" });
    await built.profileRepository.upsert(bea.user.id, { firstName: "Bea" });

    expect((await getProfile(built, ana.cookie)).json<ProfileResponse>().firstName).toBe("Ana");
    expect((await getProfile(built, bea.cookie)).json<ProfileResponse>().firstName).toBe("Bea");
  });

  it("does not create a profile as a side effect of reading", async () => {
    const built = build();
    const { cookie } = await signIn(built, "ana@example.com");

    await getProfile(built, cookie);

    expect(built.profileRepository.upsertCalls).toBe(0);
  });
});

describe("PATCH /profile", () => {
  describe("authentication", () => {
    it("returns 401 without a session cookie and persists nothing", async () => {
      const built = build();
      await signIn(built, "ana@example.com");

      const response = await patchProfile(built, undefined, { firstName: "Mallory" });

      expect(response.statusCode).toBe(401);
      expect(built.profileRepository.upsertCalls).toBe(0);
    });

    it("returns 401 for a tampered cookie and persists nothing", async () => {
      const built = build();
      const { cookie } = await signIn(built, "ana@example.com");

      const response = await patchProfile(built, `${cookie}tampered`, { firstName: "Mallory" });

      expect(response.statusCode).toBe(401);
      expect(built.profileRepository.upsertCalls).toBe(0);
    });

    it("returns 403 for a cross-origin request (CSRF defense in depth)", async () => {
      const built = build();
      const { cookie } = await signIn(built, "ana@example.com");

      const response = await patchProfile(
        built,
        cookie,
        { firstName: "Mallory" },
        { origin: "https://evil.example.com" },
      );

      expect(response.statusCode).toBe(403);
      expect(built.profileRepository.upsertCalls).toBe(0);
    });

    it("accepts a same-origin request", async () => {
      const built = build();
      const { cookie } = await signIn(built, "ana@example.com");

      const response = await patchProfile(
        built,
        cookie,
        { firstName: "Ana" },
        { origin: APP_BASE_URL },
      );

      expect(response.statusCode).toBe(200);
    });
  });

  describe("updating", () => {
    it("saves the fields and returns the persisted profile", async () => {
      const built = build();
      const { user, cookie } = await signIn(built, "ana@example.com");

      const response = await patchProfile(built, cookie, {
        firstName: "Ana",
        lastName: "García",
        nickname: "anita",
        avatarId: "avatar-04",
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({
        userId: user.id,
        firstName: "Ana",
        lastName: "García",
        nickname: "anita",
        avatarId: "avatar-04",
        email: "ana@example.com",
        role: "STUDENT",
      });
      expect(await built.profileRepository.findByUserId(user.id)).toMatchObject({
        firstName: "Ana",
        avatarId: "avatar-04",
      });
    });

    it("is visible to a later GET", async () => {
      const built = build();
      const { cookie } = await signIn(built, "ana@example.com");

      await patchProfile(built, cookie, { nickname: "anita" });
      const response = await getProfile(built, cookie);

      expect(response.json<ProfileResponse>().nickname).toBe("anita");
    });

    it("changes only the fields sent and preserves the rest", async () => {
      const built = build();
      const { cookie } = await signIn(built, "ana@example.com");
      await patchProfile(built, cookie, {
        firstName: "Ana",
        lastName: "García",
        avatarId: "avatar-01",
      });

      const response = await patchProfile(built, cookie, { nickname: "anita" });

      expect(response.json<ProfileResponse>()).toMatchObject({
        firstName: "Ana",
        lastName: "García",
        nickname: "anita",
        avatarId: "avatar-01",
      });
    });

    it("clears a text field when sent as null", async () => {
      const built = build();
      const { cookie } = await signIn(built, "ana@example.com");
      await patchProfile(built, cookie, { firstName: "Ana", nickname: "anita" });

      const response = await patchProfile(built, cookie, { nickname: null });

      expect(response.json<ProfileResponse>()).toMatchObject({ firstName: "Ana", nickname: null });
    });

    it("trims surrounding whitespace before saving", async () => {
      const built = build();
      const { cookie } = await signIn(built, "ana@example.com");

      const response = await patchProfile(built, cookie, {
        firstName: "  Ana  ",
        nickname: " fox ",
      });

      expect(response.json<ProfileResponse>()).toMatchObject({ firstName: "Ana", nickname: "fox" });
    });

    it("preserves Unicode names exactly", async () => {
      const built = build();
      const { cookie } = await signIn(built, "ana@example.com");

      const response = await patchProfile(built, cookie, {
        firstName: "Łukasz",
        lastName: "Dvořák-Nguyễn",
        nickname: "李小龙",
      });

      expect(response.json<ProfileResponse>()).toMatchObject({
        firstName: "Łukasz",
        lastName: "Dvořák-Nguyễn",
        nickname: "李小龙",
      });
    });

    it("accepts an empty object as a no-op", async () => {
      const built = build();
      const { cookie } = await signIn(built, "ana@example.com");

      const response = await patchProfile(built, cookie, {});

      expect(response.statusCode).toBe(200);
    });
  });

  describe("authorization", () => {
    it("changes only the caller's own profile", async () => {
      const built = build();
      const ana = await signIn(built, "ana@example.com");
      const bea = await signIn(built, "bea@example.com");
      await built.profileRepository.upsert(bea.user.id, { firstName: "Bea", nickname: "bea" });

      await patchProfile(built, ana.cookie, { firstName: "Ana" });

      expect(await built.profileRepository.findByUserId(bea.user.id)).toMatchObject({
        firstName: "Bea",
        nickname: "bea",
      });
      expect((await built.profileRepository.findByUserId(ana.user.id))?.firstName).toBe("Ana");
    });

    it("rejects a body naming another user's id and leaves their profile untouched", async () => {
      const built = build();
      const ana = await signIn(built, "ana@example.com");
      const bea = await signIn(built, "bea@example.com");
      await built.profileRepository.upsert(bea.user.id, { firstName: "Bea" });
      const before = built.profileRepository.upsertCalls;

      const response = await patchProfile(built, ana.cookie, {
        userId: bea.user.id,
        firstName: "Hacked",
      });

      expect(response.statusCode).toBe(400);
      expect(built.profileRepository.upsertCalls).toBe(before);
      expect((await built.profileRepository.findByUserId(bea.user.id))?.firstName).toBe("Bea");
    });

    it("has no PATCH /profile/:id route to target another user", async () => {
      const built = build();
      const ana = await signIn(built, "ana@example.com");
      const bea = await signIn(built, "bea@example.com");

      const response = await built.app.inject({
        method: "PATCH",
        url: `/profile/${bea.user.id}`,
        payload: { firstName: "Hacked" },
        cookies: { [SESSION_COOKIE_NAME]: ana.cookie },
      });

      expect(response.statusCode).toBe(404);
      expect(built.profileRepository.upsertCalls).toBe(0);
    });
  });

  describe("mass assignment", () => {
    it("rejects the forged-identity payload and changes no account or profile data", async () => {
      const built = build();
      const ana = await signIn(built, "ana@example.com");
      const bea = await signIn(built, "bea@example.com");

      const response = await patchProfile(built, ana.cookie, {
        role: "teacher",
        userId: bea.user.id,
        emailVerified: true,
      });

      expect(response.statusCode).toBe(400);
      expect(built.profileRepository.upsertCalls).toBe(0);
      expect(built.userRepository.users.find((u) => u.id === ana.user.id)).toMatchObject({
        role: "STUDENT",
        email: "ana@example.com",
      });
    });

    it.each([
      ["role", "TEACHER"],
      ["email", "attacker@example.com"],
      ["emailVerified", false],
      ["passwordHash", "x"],
      ["id", "another-id"],
      ["subscriptionStatus", "premium"],
    ])("rejects a legitimate edit that also smuggles in %s", async (field, value) => {
      const built = build();
      const { user, cookie } = await signIn(built, "ana@example.com");

      const response = await patchProfile(built, cookie, { firstName: "Ana", [field]: value });

      expect(response.statusCode).toBe(400);
      expect(built.profileRepository.upsertCalls).toBe(0);
      expect(built.userRepository.users.find((u) => u.id === user.id)).toMatchObject({
        role: "STUDENT",
        email: "ana@example.com",
        emailVerified: true,
      });
    });

    it("rejects a __proto__ pollution attempt", async () => {
      const built = build();
      const { cookie } = await signIn(built, "ana@example.com");

      const response = await patchProfile(
        built,
        cookie,
        '{"firstName":"Ana","__proto__":{"role":"TEACHER"}}',
        { "content-type": "application/json" },
      );

      expect(response.statusCode).toBe(400);
      expect(built.profileRepository.upsertCalls).toBe(0);
    });
  });

  describe("validation", () => {
    it("rejects a whitespace-only nickname with a field error and persists nothing", async () => {
      const built = build();
      const { cookie } = await signIn(built, "ana@example.com");

      const response = await patchProfile(built, cookie, { nickname: "     " });

      expect(response.statusCode).toBe(400);
      const body = response.json<ProfileValidationErrorResponse>();
      expect(body.error).toBe("Invalid request body.");
      expect(body.fields?.nickname).toMatch(/\d/);
      expect(built.profileRepository.upsertCalls).toBe(0);
    });

    it("attributes each error to the right field", async () => {
      const built = build();
      const { cookie } = await signIn(built, "ana@example.com");

      const response = await patchProfile(built, cookie, {
        firstName: "",
        lastName: "a".repeat(101),
        nickname: "x",
        avatarId: "avatar-99",
      });

      const fields = response.json<ProfileValidationErrorResponse>().fields;
      expect(Object.keys(fields ?? {}).sort()).toEqual([
        "avatarId",
        "firstName",
        "lastName",
        "nickname",
      ]);
    });

    it("rejects an over-long name", async () => {
      const built = build();
      const { cookie } = await signIn(built, "ana@example.com");

      const response = await patchProfile(built, cookie, { firstName: "a".repeat(101) });

      expect(response.statusCode).toBe(400);
      expect(built.profileRepository.upsertCalls).toBe(0);
    });

    it("rejects a name containing a line break", async () => {
      const built = build();
      const { cookie } = await signIn(built, "ana@example.com");

      const response = await patchProfile(built, cookie, { firstName: "Ana\nMaria" });

      expect(response.statusCode).toBe(400);
    });

    it.each(["avatar-99", "https://evil.example.com/a.png", "javascript:alert(1)", ""])(
      "rejects the avatar id %j and persists nothing",
      async (avatarId) => {
        const built = build();
        const { cookie } = await signIn(built, "ana@example.com");

        const response = await patchProfile(built, cookie, { avatarId });

        expect(response.statusCode).toBe(400);
        expect(response.json<ProfileValidationErrorResponse>().fields?.avatarId).toBeTruthy();
        expect(built.profileRepository.upsertCalls).toBe(0);
      },
    );

    it("does not echo the rejected input back in the error", async () => {
      const built = build();
      const { cookie } = await signIn(built, "ana@example.com");

      const response = await patchProfile(built, cookie, {
        avatarId: "https://evil.example.com/a.png",
      });

      expect(response.body).not.toContain("evil.example.com");
    });

    it.each([[["Ana"]], ["Ana"], [42], [null]])("rejects the non-object body %j", async (body) => {
      const built = build();
      const { cookie } = await signIn(built, "ana@example.com");

      const response = await patchProfile(built, cookie, JSON.stringify(body), {
        "content-type": "application/json",
      });

      expect(response.statusCode).toBe(400);
    });

    it("rejects malformed JSON with 400 and no internals in the body", async () => {
      const built = build();
      const { cookie } = await signIn(built, "ana@example.com");

      const response = await patchProfile(built, cookie, '{"firstName": "Ana"', {
        "content-type": "application/json",
      });

      expect(response.statusCode).toBe(400);
      expect(response.body).not.toMatch(/SyntaxError|stack|at .*\(|node_modules/i);
      expect(built.profileRepository.upsertCalls).toBe(0);
    });

    it("rejects an oversized body before parsing it", async () => {
      const built = build();
      const { cookie } = await signIn(built, "ana@example.com");

      const response = await patchProfile(built, cookie, { firstName: "a".repeat(100_000) });

      expect(response.statusCode).toBe(413);
      expect(built.profileRepository.upsertCalls).toBe(0);
    });
  });

  describe("hostile-looking text is stored as inert data", () => {
    it("round-trips an XSS-shaped value unchanged, served as JSON not HTML", async () => {
      const built = build();
      const { cookie } = await signIn(built, "ana@example.com");
      const payload = "<script>alert(1)</script>";

      const response = await patchProfile(built, cookie, { firstName: payload, nickname: payload });

      expect(response.statusCode).toBe(200);
      expect(response.headers["content-type"]).toMatch(/application\/json/);
      expect(response.json<ProfileResponse>()).toMatchObject({
        firstName: payload,
        nickname: payload,
      });
    });

    it("round-trips a SQL-injection-shaped value unchanged", async () => {
      const built = build();
      const { cookie } = await signIn(built, "ana@example.com");
      const payload = "Robert'); DROP TABLE users;--";

      const response = await patchProfile(built, cookie, { lastName: payload });

      expect(response.json<ProfileResponse>().lastName).toBe(payload);
    });
  });

  describe("unexpected failures", () => {
    const INTERNAL_DETAIL =
      'connect ECONNREFUSED 10.0.0.5:5432: password authentication failed for user "app_prod"';

    it("returns a generic 500 that leaks nothing when saving fails inside the database layer", async () => {
      const built = build();
      const { cookie } = await signIn(built, "ana@example.com");
      vi.spyOn(built.profileRepository, "upsert").mockRejectedValue(new Error(INTERNAL_DETAIL));

      const response = await patchProfile(built, cookie, { firstName: "Ana" });

      expect(response.statusCode).toBe(500);
      expect(response.json()).toEqual({ error: "Internal Server Error" });
      expect(response.body).not.toMatch(/ECONNREFUSED|password|app_prod|5432/i);
    });

    it("returns a generic 500 that leaks nothing when reading fails inside the database layer", async () => {
      const built = build();
      const { cookie } = await signIn(built, "ana@example.com");
      vi.spyOn(built.profileRepository, "findByUserId").mockRejectedValue(
        new Error(INTERNAL_DETAIL),
      );

      const response = await getProfile(built, cookie);

      expect(response.statusCode).toBe(500);
      expect(response.json()).toEqual({ error: "Internal Server Error" });
      expect(response.body).not.toMatch(/ECONNREFUSED|password|app_prod|5432/i);
    });
  });

  describe("response", () => {
    it("never includes secrets or internal fields", async () => {
      const built = build();
      const { cookie } = await signIn(built, "ana@example.com");

      const response = await patchProfile(built, cookie, { firstName: "Ana" });

      expect(Object.keys(response.json<object>()).sort()).toEqual(
        ["avatarId", "email", "firstName", "lastName", "nickname", "role", "userId"].sort(),
      );
      expect(response.body).not.toMatch(/password|hash|token|createdAt|updatedAt/i);
    });
  });
});
