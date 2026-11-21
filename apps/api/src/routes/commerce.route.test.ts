import { randomUUID } from "node:crypto";

import { loadEnv } from "@verbysia/config";
import type { AdminLicence, MyAccessResponse } from "@verbysia/contracts";
import type { FastifyInstance } from "fastify";
import { afterEach, describe, expect, it } from "vitest";

import { SESSION_COOKIE_NAME } from "../constants/session-cookie.js";
import { buildServer } from "../server.js";
import { buildTestDeps } from "../test-support/build-test-deps.js";

const APP_BASE_URL = "https://app.example.com";
const PASSWORD = "correct-password";
const NOW = new Date("2026-01-01T00:00:00.000Z");

let app: FastifyInstance | undefined;
afterEach(async () => {
  await app?.close();
  app = undefined;
});

function build() {
  const testDeps = buildTestDeps(NOW);
  app = buildServer(
    loadEnv({ NODE_ENV: "test", APP_BASE_URL, AUTH_SESSION_SECRET: "test-secret-value" }),
    testDeps.appDeps,
  );
  return { app, ...testDeps };
}
type Built = ReturnType<typeof build>;

async function signIn(built: Built, role: "STUDENT" | "ADMIN", email: string) {
  // Real user ids are UUIDs, and the admin routes validate them as such.
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

describe("commerce routes", () => {
  it("serves the public price list without a session; nothing is purchasable yet", async () => {
    const built = build();
    const response = await built.app.inject({ method: "GET", url: "/products" });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      products: [{ id: "course-a1", priceMinor: 14900, purchasable: false, status: "active" }],
    });
  });

  it("refuses every admin route to a student (403) and to anonymous callers (401)", async () => {
    const built = build();
    const student = await signIn(built, "STUDENT", "student@example.com");

    const anonymous = await built.app.inject({ method: "GET", url: "/admin/users" });
    const forbidden = await built.app.inject({
      method: "GET",
      url: "/admin/users",
      cookies: student.cookies,
    });
    const grantAttempt = await built.app.inject({
      method: "POST",
      url: `/admin/users/${student.userId}/licences`,
      headers: { origin: APP_BASE_URL },
      cookies: student.cookies,
      payload: { kind: "PREMIUM_YEARLY", days: null, note: null },
    });

    expect(anonymous.statusCode).toBe(401);
    expect(forbidden.statusCode).toBe(403);
    expect(grantAttempt.statusCode).toBe(403);
    expect(built.commerce.licenceRows).toEqual([]);
  });

  it("lets an admin grant and revoke a licence, audits both, and the learner sees it", async () => {
    const built = build();
    const admin = await signIn(built, "ADMIN", "admin@example.com");
    const learner = await signIn(built, "STUDENT", "learner@example.com");

    const granted = await built.app.inject({
      method: "POST",
      url: `/admin/users/${learner.userId}/licences`,
      headers: { origin: APP_BASE_URL },
      cookies: admin.cookies,
      payload: { kind: "COURSE_A1", days: 30, note: "Wsparcie" },
    });
    expect(granted.statusCode).toBe(201);
    const licence = granted.json<AdminLicence>();
    expect(licence).toMatchObject({ kind: "COURSE_A1", active: true, source: "admin" });

    const access = (
      await built.app.inject({ method: "GET", url: "/me/access", cookies: learner.cookies })
    ).json<MyAccessResponse>();
    expect(access.licences.map((l) => l.kind)).toEqual(["COURSE_A1"]);

    const revoked = await built.app.inject({
      method: "POST",
      url: `/admin/licences/${licence.id}/revoke`,
      headers: { origin: APP_BASE_URL },
      cookies: admin.cookies,
    });
    expect(revoked.json<AdminLicence>().active).toBe(false);
    expect(built.commerce.auditRows.map((e) => e.action)).toEqual([
      "licence.granted",
      "licence.revoked",
    ]);
    expect(built.commerce.auditRows.every((e) => e.actorUserId === admin.userId)).toBe(true);
  });

  it("validates product changes and records them", async () => {
    const built = build();
    const admin = await signIn(built, "ADMIN", "admin@example.com");
    const patch = (payload: unknown) =>
      built.app.inject({
        method: "PATCH",
        url: "/admin/products/course-a1",
        headers: { origin: APP_BASE_URL },
        cookies: admin.cookies,
        payload: payload as Record<string, unknown>,
      });

    expect((await patch({ priceMinor: -1 })).statusCode).toBe(400);
    expect((await patch({})).statusCode).toBe(400);
    const ok = await patch({ priceMinor: 12900 });
    expect(ok.json()).toMatchObject({ priceMinor: 12900 });
    expect(built.commerce.auditRows.map((e) => e.action)).toEqual(["product.updated"]);
  });
});
