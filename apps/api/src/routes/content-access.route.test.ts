import { loadEnv } from "@verbysia/config";
import { makeContentItem, makeLessonCatalog } from "@verbysia/application/testing";
import type { FastifyInstance } from "fastify";
import { afterEach, describe, expect, it } from "vitest";

import { SESSION_COOKIE_NAME } from "../constants/session-cookie.js";
import { buildServer } from "../server.js";
import { buildTestDeps } from "../test-support/build-test-deps.js";

const APP_BASE_URL = "https://app.example.com";
const PASSWORD = "correct-password";
const NOW = new Date("2026-01-01T00:00:00.000Z");
const PAID = "pl-paid-unit";

let app: FastifyInstance | undefined;
afterEach(async () => {
  await app?.close();
  app = undefined;
});

function build() {
  const testDeps = buildTestDeps(NOW);
  const catalog = makeLessonCatalog();
  testDeps.contentRepository.catalog = {
    ...catalog,
    content: [
      ...catalog.content,
      makeContentItem(PAID, "pl", "a1", { order: 90, access: "course" }),
    ],
  };
  app = buildServer(
    loadEnv({ NODE_ENV: "test", APP_BASE_URL, AUTH_SESSION_SECRET: "test-secret-value" }),
    testDeps.appDeps,
  );
  return { app, ...testDeps };
}
type Built = ReturnType<typeof build>;

async function signIn(built: Built) {
  const email = "learner@example.com";
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
  const cookie = response.cookies.find((c) => c.name === SESSION_COOKIE_NAME)?.value ?? "";
  return { userId: user.id, cookies: { [SESSION_COOKIE_NAME]: cookie } };
}

describe("server-side licence gate on paid lessons", () => {
  it("locks a paid lesson for anonymous visitors and for learners without a licence", async () => {
    const built = build();
    const { cookies } = await signIn(built);

    const anonymous = await built.app.inject({ method: "GET", url: `/content/${PAID}` });
    const lesson = await built.app.inject({ method: "GET", url: `/lessons/${PAID}`, cookies });
    const start = await built.app.inject({
      method: "POST",
      url: `/lessons/${PAID}/start`,
      headers: { origin: APP_BASE_URL },
      cookies,
      payload: {},
    });

    for (const response of [anonymous, lesson, start]) {
      expect(response.statusCode).toBe(403);
      expect(response.json()).toEqual({ error: "Locked.", code: "LICENCE_REQUIRED" });
    }
  });

  it("opens it with the matching course licence, and free lessons stay open to everyone", async () => {
    const built = build();
    const { userId, cookies } = await signIn(built);
    await built.commerce.licences.grant({
      userId,
      kind: "COURSE_A1",
      startsAt: new Date("2025-01-01T00:00:00.000Z"),
      endsAt: null,
      source: "admin",
      sourceId: null,
      note: null,
      createdAt: NOW,
    });

    const lesson = await built.app.inject({ method: "GET", url: `/lessons/${PAID}`, cookies });
    const freeAnonymous = await built.app.inject({ method: "GET", url: "/content/pl-note" });

    expect(lesson.statusCode).toBe(200);
    expect(freeAnonymous.statusCode).toBe(200);
  });

  it("still answers 404 (not 403) for an id that names nothing", async () => {
    const built = build();
    const { cookies } = await signIn(built);

    const response = await built.app.inject({
      method: "GET",
      url: "/lessons/pl-nothing-here",
      cookies,
    });
    expect(response.statusCode).toBe(404);
  });
});
