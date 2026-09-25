import { loadEnv } from "@tfm-bic/config";
import type { VideoGenerationJobResponse } from "@tfm-bic/contracts";
import { makeVideoDefinition } from "@tfm-bic/domain/testing";
import { FakeVideoGenerationService, type FakeVideoGenerationScenario } from "@tfm-bic/data";
import type { FastifyInstance } from "fastify";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SESSION_COOKIE_NAME } from "../constants/session-cookie.js";
import { buildServer } from "../server.js";
import { buildTestDeps } from "../test-support/build-test-deps.js";

const APP_BASE_URL = "https://app.example.com";
const PASSWORD = "correct-password";
const NOW = new Date("2026-01-01T00:00:00.000Z");
const DEFINITION_ID = "pl-a1-nasal-vowels-demo";

let app: FastifyInstance | undefined;

afterEach(async () => {
  await app?.close();
  app = undefined;
});

function build(
  overrides: Partial<Parameters<typeof loadEnv>[0]> = {},
  scenarios: ReadonlyMap<string, FakeVideoGenerationScenario> = new Map(),
) {
  const testDeps = buildTestDeps(NOW);
  testDeps.videoDefinitionRepository.definitions.push(
    makeVideoDefinition({ languageId: "pl" as never }),
  );
  testDeps.videoDeps.provider = new FakeVideoGenerationService(scenarios);
  app = buildServer(
    loadEnv({
      NODE_ENV: "test",
      APP_BASE_URL,
      AUTH_SESSION_SECRET: "test-secret-value",
      ...overrides,
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
  );
  return { app, ...testDeps };
}

type Built = ReturnType<typeof build>;

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
    payload: { email, password: PASSWORD },
  });
  const cookie = response.cookies.find((c) => c.name === SESSION_COOKIE_NAME)?.value;
  if (!cookie) {
    throw new Error("test setup failed: no session cookie");
  }
  return { user, cookie };
}

function cookiesOf(cookie: string | undefined) {
  return cookie ? { cookies: { [SESSION_COOKIE_NAME]: cookie } } : {};
}

function requestGeneration(
  built: Built,
  cookie: string | undefined,
  videoDefinitionId: unknown = DEFINITION_ID,
  headers: Record<string, string> = { origin: APP_BASE_URL },
) {
  return built.app.inject({
    method: "POST",
    url: "/video-generations",
    payload: { videoDefinitionId },
    headers,
    ...cookiesOf(cookie),
  });
}

function getStatus(built: Built, cookie: string | undefined, jobId: string) {
  return built.app.inject({
    method: "GET",
    url: `/video-generations/${jobId}`,
    ...cookiesOf(cookie),
  });
}

describe("authentication — every video-generation route is authenticated-only, server-side", () => {
  it.each([
    ["POST /video-generations", (b: Built, c?: string) => requestGeneration(b, c)],
    [
      "GET /video-generations/:jobId",
      (b: Built, c?: string) => getStatus(b, c, "11111111-1111-4111-8111-111111111111"),
    ],
  ])(
    "%s returns 401 without a session, with a tampered cookie and after logout",
    async (_n, call) => {
      const built = build();
      const { cookie } = await signIn(built, "ana@example.com");

      const anonymous = await call(built);
      const tampered = await call(built, `${cookie}tampered`);
      await built.app.inject({
        method: "POST",
        url: "/auth/logout",
        cookies: { [SESSION_COOKIE_NAME]: cookie },
      });
      const loggedOut = await call(built, cookie);

      for (const response of [anonymous, tampered, loggedOut]) {
        expect(response.statusCode).toBe(401);
        expect(response.json()).toEqual({ error: "Unauthenticated" });
      }
    },
  );
});

describe("POST /video-generations", () => {
  it("rejects a mismatched Origin header (CSRF defense in depth)", async () => {
    const built = build();
    const { cookie } = await signIn(built, "ana@example.com");

    const response = await requestGeneration(built, cookie, DEFINITION_ID, {
      origin: "https://evil.example.com",
    });

    expect(response.statusCode).toBe(403);
  });

  it("rejects a body naming anything other than videoDefinitionId", async () => {
    const built = build();
    const { cookie } = await signIn(built, "ana@example.com");

    const response = await built.app.inject({
      method: "POST",
      url: "/video-generations",
      headers: { origin: APP_BASE_URL },
      payload: { videoDefinitionId: DEFINITION_ID, userId: "someone-else" },
      ...cookiesOf(cookie),
    });

    expect(response.statusCode).toBe(400);
  });

  it("rejects a malformed videoDefinitionId", async () => {
    const built = build();
    const { cookie } = await signIn(built, "ana@example.com");

    const response = await requestGeneration(built, cookie, "../etc/passwd");

    expect(response.statusCode).toBe(400);
  });

  it("returns 404 for a video definition that does not exist", async () => {
    const built = build();
    const { cookie } = await signIn(built, "ana@example.com");

    const response = await requestGeneration(built, cookie, "pl-does-not-exist");

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({ error: "Video definition not found." });
  });

  it("starts a generation and returns 201 with the job queued/processing, never waiting for the provider", async () => {
    const built = build();
    const { cookie } = await signIn(built, "ana@example.com");

    const response = await requestGeneration(built, cookie);

    expect(response.statusCode).toBe(201);
    const body: VideoGenerationJobResponse = response.json();
    expect(body.status).toBe("processing");
    expect(body.videoDefinitionId).toBe(DEFINITION_ID);
    expect(body).not.toHaveProperty("userId");
  });

  it("sends Cache-Control: private, no-store", async () => {
    const built = build();
    const { cookie } = await signIn(built, "ana@example.com");

    const response = await requestGeneration(built, cookie);

    expect(response.headers["cache-control"]).toBe("private, no-store");
  });

  it("bounds how many generations a student can start", async () => {
    const built = build();
    const { cookie } = await signIn(built, "ana@example.com");

    let last = 0;
    for (let request = 0; request < 11; request += 1) {
      last = (await requestGeneration(built, cookie)).statusCode;
    }

    expect(last).toBe(429);
  });

  it("relaxes the limit only when the E2E-only flag is set", async () => {
    const built = build({ E2E_RELAXED_RATE_LIMITS: "true" });
    const { cookie } = await signIn(built, "ana@example.com");

    let last = 0;
    for (let request = 0; request < 15; request += 1) {
      last = (await requestGeneration(built, cookie)).statusCode;
    }

    expect(last).toBe(201);
  });
});

describe("GET /video-generations/:jobId", () => {
  it("returns 400 for a non-UUID job id", async () => {
    const built = build();
    const { cookie } = await signIn(built, "ana@example.com");

    const response = await getStatus(built, cookie, "not-a-uuid");

    expect(response.statusCode).toBe(400);
  });

  it("returns 404 for a job that does not exist", async () => {
    const built = build();
    const { cookie } = await signIn(built, "ana@example.com");

    const response = await getStatus(built, cookie, "11111111-1111-4111-8111-111111111111");

    expect(response.statusCode).toBe(404);
  });

  it("returns 404 (never 403) for a job that belongs to another student — IDOR-safe", async () => {
    const built = build();
    const { cookie: ownerCookie } = await signIn(built, "owner@example.com");
    const { cookie: otherCookie } = await signIn(built, "other@example.com");
    const created = await requestGeneration(built, ownerCookie);
    const createdBody: VideoGenerationJobResponse = created.json();

    const response = await getStatus(built, otherCookie, createdBody.id);

    expect(response.statusCode).toBe(404);
  });

  it("polls to completed once the provider resolves, with a media reference", async () => {
    const built = build();
    const { cookie } = await signIn(built, "ana@example.com");
    const created = await requestGeneration(built, cookie);
    const createdBody: VideoGenerationJobResponse = created.json();
    const jobId = createdBody.id;

    await vi.waitFor(async () => {
      const response = await getStatus(built, cookie, jobId);
      const polled: VideoGenerationJobResponse = response.json();
      expect(polled.status).toBe("completed");
    });

    const response = await getStatus(built, cookie, jobId);
    const body: VideoGenerationJobResponse = response.json();
    expect(body.status).toBe("completed");
    expect(body.mediaReference).toBeTruthy();
    expect(body.errorCategory).toBeNull();
  });

  it("polls to failed, with a safe category, when the provider rejects — never as an HTTP error", async () => {
    const built = build({}, new Map([[DEFINITION_ID, "provider-rejected"]]));
    const { cookie } = await signIn(built, "ana@example.com");
    const created = await requestGeneration(built, cookie);
    const createdBody: VideoGenerationJobResponse = created.json();
    const jobId = createdBody.id;

    await vi.waitFor(async () => {
      const response = await getStatus(built, cookie, jobId);
      const polled: VideoGenerationJobResponse = response.json();
      expect(polled.status).toBe("failed");
    });

    const response = await getStatus(built, cookie, jobId);
    expect(response.statusCode).toBe(200);
    const body: VideoGenerationJobResponse = response.json();
    expect(body.status).toBe("failed");
    expect(body.errorCategory).toBe("provider_rejected");
    expect(body.mediaReference).toBeNull();
  });
});
