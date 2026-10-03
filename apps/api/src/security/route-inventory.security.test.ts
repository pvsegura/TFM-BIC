import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { SESSION_COOKIE_NAME } from "../constants/session-cookie.js";
import { buildTestServer, TEST_APP_BASE_URL } from "../test-support/build-test-server.js";

/**
 * M16 — default deny, enforced by a test (docs/security/M16-AUTHORIZATION-MATRIX.md). Every route
 * the server registers must be classified below. A new route that is not listed fails this file
 * until someone decides whether it is public, and every unlisted route must refuse a request
 * without a session. State-changing routes must refuse a foreign Origin.
 */

/** Reachable without a session, by design (catalog, health, the auth flows, token links). */
const PUBLIC_ROUTES = new Set([
  "GET /health",
  "GET /ready",
  "GET /languages",
  "GET /languages/:languageCode/levels",
  "GET /content",
  "GET /content/:contentId",
  "POST /auth/register",
  "POST /auth/login",
  "POST /auth/logout",
  "POST /auth/email-verification/confirm",
  "POST /auth/email-verification/resend",
  "POST /auth/password-reset/request",
  "POST /auth/password-reset/confirm",
  "POST /email-preferences/newsletter/confirm",
  "POST /email-preferences/newsletter/unsubscribe",
  // M18: the SPA's error report — errors happen before login too. Same-origin, rate limited.
  "POST /client-errors",
  // M21 (ADR-031): published educational media of published content — read-only, generated
  // offline, files served only from the manifest's allowlist. Public like the catalog.
  "GET /media",
  "GET /media/lessons/:lessonId",
  "GET /media/vocabulary/:vocabularyId",
  "GET /media/grammar/:topicId",
  "GET /media/files/*",
  // M23: the grammar reference — public, read-only lookup tables (no progress, no user data).
  "GET /grammar",
  "GET /grammar/:topicId",
]);

/** Authorized by an HMAC token in the link; RFC 8058 mail clients send no Origin (ADR-025). */
const ORIGIN_CHECK_EXCEPTIONS = new Set(["POST /email-preferences/newsletter/unsubscribe"]);

/** TEACHER only (`requireRole`), in addition to a session. */
const TEACHER_ROUTES = new Set([
  "GET /teacher-dashboard/overview",
  "GET /teacher-dashboard/students",
  "GET /teacher-dashboard/students/:studentId",
]);

const STATE_CHANGING = new Set(["POST", "PUT", "PATCH", "DELETE"]);

interface Route {
  key: string;
  method: string;
  url: string;
}

let app: FastifyInstance;
let routes: Route[];
let studentCookie: string;

function concreteUrl(url: string): string {
  // A syntactically valid id for every parameter, so requests reach the route's hooks.
  return url
    .replace(/:studentId/g, "11111111-1111-4111-8111-111111111111")
    .replace(/:jobId/g, "11111111-1111-4111-8111-111111111111")
    .replace(/:languageCode/g, "pl")
    .replace(/:[A-Za-z]+/g, "pl-greetings");
}

function send(route: Route, headers: Record<string, string>, cookie?: string) {
  return app.inject({
    method: route.method as "GET",
    url: concreteUrl(route.url),
    headers,
    ...(cookie ? { cookies: { [SESSION_COOKIE_NAME]: cookie } } : {}),
    ...(STATE_CHANGING.has(route.method) ? { payload: {} } : {}),
  });
}

beforeAll(async () => {
  // METRICS_TOKEN registers GET /internal/metrics (M18), so the inventory covers it too.
  const built = buildTestServer({ METRICS_TOKEN: "inventory-metrics-token-0123456789abcdef" });
  app = built.app;
  const collected: Route[] = [];
  app.addHook("onRoute", (options) => {
    const methods = Array.isArray(options.method) ? options.method : [options.method];
    for (const method of methods) {
      if (method !== "HEAD" && method !== "OPTIONS") {
        collected.push({ key: `${method} ${options.url}`, method, url: options.url });
      }
    }
  });
  await app.ready();
  routes = collected;

  const email = "student@example.com";
  built.testDeps.userRepository.seed("STUDENT", {
    email,
    normalizedEmail: email,
    passwordHash: await built.testDeps.passwordHasher.hash("correct-password"),
    emailVerified: true,
  });
  const login = await app.inject({
    method: "POST",
    url: "/auth/login",
    payload: { email, password: "correct-password" },
  });
  studentCookie = login.cookies.find((c) => c.name === SESSION_COOKIE_NAME)?.value ?? "";
});

afterAll(async () => {
  await app.close();
});

describe("route inventory (default deny)", () => {
  it("finds the routes (sanity check of the inventory itself)", () => {
    expect(routes.length).toBeGreaterThan(40);
    expect(studentCookie).not.toBe("");
  });

  it("registers no test-support route outside the E2E composition", () => {
    expect(routes.filter((r) => r.url.includes("/_test/"))).toEqual([]);
  });

  it("every listed public route still exists (the allowlist cannot silently go stale)", () => {
    const keys = new Set(routes.map((r) => r.key));
    for (const key of [...PUBLIC_ROUTES, ...TEACHER_ROUTES]) {
      expect(keys, key).toContain(key);
    }
  });

  it("every non-public route refuses a request without a session (401)", async () => {
    const unexpected: string[] = [];
    for (const route of routes.filter((r) => !PUBLIC_ROUTES.has(r.key))) {
      const response = await send(route, { origin: TEST_APP_BASE_URL });
      if (response.statusCode !== 401) {
        unexpected.push(`${route.key} → ${String(response.statusCode)}`);
      }
    }
    expect(unexpected).toEqual([]);
  });

  it("every state-changing route refuses a cross-origin request (403), except documented token links", async () => {
    const unexpected: string[] = [];
    const candidates = routes.filter(
      (r) => STATE_CHANGING.has(r.method) && !ORIGIN_CHECK_EXCEPTIONS.has(r.key),
    );
    for (const route of candidates) {
      const response = await send(route, { origin: "https://evil.example" }, studentCookie);
      if (response.statusCode !== 403) {
        unexpected.push(`${route.key} → ${String(response.statusCode)}`);
      }
    }
    expect(candidates.length).toBeGreaterThan(20);
    expect(unexpected).toEqual([]);
  });

  it("every teacher route refuses an authenticated student (403)", async () => {
    for (const key of TEACHER_ROUTES) {
      const route = routes.find((r) => r.key === key);
      expect(route, key).toBeDefined();
      const response = await send(route!, { origin: TEST_APP_BASE_URL }, studentCookie);
      expect(response.statusCode, key).toBe(403);
    }
  });

  it("no route takes a user id in its path (identity always comes from the session)", () => {
    expect(routes.filter((r) => /:(userId|ownerId|accountId)\b/.test(r.url))).toEqual([]);
  });
});
