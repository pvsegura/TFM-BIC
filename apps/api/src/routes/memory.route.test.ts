import { loadEnv } from "@verbysia/config";
import type {
  MemoryReviewResponse,
  MemorySessionResponse,
  MemoryStatsResponse,
} from "@verbysia/contracts";
import { makeVocabularyCatalog } from "@verbysia/application/testing";
import type { FastifyInstance } from "fastify";
import { afterEach, describe, expect, it } from "vitest";

import { SESSION_COOKIE_NAME } from "../constants/session-cookie.js";
import { buildServer } from "../server.js";
import { buildTestDeps } from "../test-support/build-test-deps.js";

const APP_BASE_URL = "https://app.example.com";
const PASSWORD = "correct-password";
const NOW = new Date("2026-01-01T00:00:00.000Z");
const REVIEW_ID = "7f1d8a52-3c1e-4b8e-9a43-2b6f0d9e1c11";

let app: FastifyInstance | undefined;
afterEach(async () => {
  await app?.close();
  app = undefined;
});

function build() {
  const testDeps = buildTestDeps(NOW);
  const catalog = makeVocabularyCatalog();
  testDeps.contentRepository.catalog = catalog;
  testDeps.vocabularyRepository.categories = [...catalog.vocabularyCategories];
  testDeps.vocabularyRepository.items = [...catalog.vocabulary];
  app = buildServer(
    loadEnv({ NODE_ENV: "test", APP_BASE_URL, AUTH_SESSION_SECRET: "test-secret-value" }),
    testDeps.appDeps,
  );
  return { app, ...testDeps };
}
type Built = ReturnType<typeof build>;

async function signIn(built: Built, email = "learner@example.com") {
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

function grant(built: Built, userId: string, kind: "COURSE_A1" | "PREMIUM_MONTHLY") {
  return built.commerce.licences.grant({
    userId,
    kind,
    startsAt: new Date("2025-01-01T00:00:00.000Z"),
    endsAt: null,
    source: "admin",
    sourceId: null,
    note: null,
    createdAt: NOW,
  });
}

describe("memory trainer routes", () => {
  it("requires a session", async () => {
    const built = build();
    const response = await built.app.inject({ method: "GET", url: "/memory/session?language=pl" });
    expect(response.statusCode).toBe(401);
  });

  it("offers no course vocabulary without a licence (checked on the server)", async () => {
    const built = build();
    const { cookies } = await signIn(built);

    const response = await built.app.inject({
      method: "GET",
      url: "/memory/session?language=pl",
      cookies,
    });
    const review = await built.app.inject({
      method: "POST",
      url: "/memory/reviews",
      headers: { origin: APP_BASE_URL },
      cookies,
      payload: {
        vocabularyItemId: "pl-dom",
        grade: "good",
        clientReviewId: REVIEW_ID,
        usedHint: false,
      },
    });

    expect(response.json<MemorySessionResponse>().cards).toEqual([]);
    expect(review.statusCode).toBe(404);
  });

  it("serves new cards with a course licence, records answers once and reports stats", async () => {
    const built = build();
    const { userId, cookies } = await signIn(built);
    await grant(built, userId, "COURSE_A1");

    const session = (
      await built.app.inject({ method: "GET", url: "/memory/session?language=pl", cookies })
    ).json<MemorySessionResponse>();
    expect(session.cards.map((c) => c.vocabularyItemId)).toEqual(["pl-dom", "pl-kot"]);
    expect(session.cards.every((c) => c.isNew)).toBe(true);

    const answer = () =>
      built.app.inject({
        method: "POST",
        url: "/memory/reviews",
        headers: { origin: APP_BASE_URL },
        cookies,
        payload: {
          vocabularyItemId: "pl-dom",
          grade: "good",
          clientReviewId: REVIEW_ID,
          usedHint: false,
        },
      });
    const first = (await answer()).json<MemoryReviewResponse>();
    const retry = (await answer()).json<MemoryReviewResponse>();
    expect(first).toMatchObject({ duplicate: false, card: { isNew: false, intervalDays: 1 } });
    expect(retry.duplicate).toBe(true);
    expect(built.memoryCards.reviews).toHaveLength(1);

    const stats = (
      await built.app.inject({ method: "GET", url: "/memory/stats?language=pl", cookies })
    ).json<MemoryStatsResponse>();
    expect(stats).toMatchObject({ totalCards: 1, reviewsToday: 1, newAvailable: 1, streakDays: 1 });
  });

  it("opens level-less entries only with Premium", async () => {
    const built = build();
    const { userId, cookies } = await signIn(built);
    await grant(built, userId, "PREMIUM_MONTHLY");

    const session = (
      await built.app.inject({ method: "GET", url: "/memory/session?language=pl", cookies })
    ).json<MemorySessionResponse>();
    expect(session.cards.map((c) => c.vocabularyItemId)).toContain("pl-chleb");
  });

  it("refuses a review from another origin and a malformed body", async () => {
    const built = build();
    const { cookies } = await signIn(built);
    const payload = {
      vocabularyItemId: "pl-dom",
      grade: "good",
      clientReviewId: REVIEW_ID,
      usedHint: false,
    };

    const crossSite = await built.app.inject({
      method: "POST",
      url: "/memory/reviews",
      headers: { origin: "https://evil.example.com" },
      cookies,
      payload,
    });
    const malformed = await built.app.inject({
      method: "POST",
      url: "/memory/reviews",
      headers: { origin: APP_BASE_URL },
      cookies,
      payload: { ...payload, grade: "perfect" },
    });

    expect(crossSite.statusCode).toBe(403);
    expect(malformed.statusCode).toBe(400);
  });
});
