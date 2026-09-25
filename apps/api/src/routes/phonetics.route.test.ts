import { loadEnv } from "@tfm-bic/config";
import type {
  PhoneticListResponse,
  PhoneticRepresentationResponse,
  PhoneticTopicsResponse,
  PhoneticUserProgressResponse,
} from "@tfm-bic/contracts";
import { makePhoneticsCatalog } from "@tfm-bic/application/testing";
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

function build(overrides: Partial<Parameters<typeof loadEnv>[0]> = {}) {
  const testDeps = buildTestDeps(NOW);
  const catalog = makePhoneticsCatalog();
  testDeps.contentRepository.catalog = catalog;
  testDeps.phoneticRepository.topics = [...catalog.phoneticTopics];
  testDeps.phoneticRepository.representations = [...catalog.phonetics];
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

function listPhonetics(built: Built, cookie: string | undefined, query = "language=pl") {
  return built.app.inject({ method: "GET", url: `/phonetics?${query}`, ...cookiesOf(cookie) });
}

function getTopics(built: Built, cookie: string | undefined, query = "language=pl") {
  return built.app.inject({
    method: "GET",
    url: `/phonetics/topics?${query}`,
    ...cookiesOf(cookie),
  });
}

function getRepresentation(built: Built, cookie: string | undefined, id: string) {
  return built.app.inject({ method: "GET", url: `/phonetics/${id}`, ...cookiesOf(cookie) });
}

function act(
  built: Built,
  action: "view" | "practice" | "complete",
  cookie: string | undefined,
  id: string,
  options: { payload?: unknown; headers?: Record<string, string> } = {},
) {
  return built.app.inject({
    method: "POST",
    url: `/phonetics/${id}/${action}`,
    ...(options.payload === undefined ? {} : { payload: options.payload as object }),
    ...(options.headers ? { headers: options.headers } : {}),
    ...cookiesOf(cookie),
  });
}

describe("authentication — every phonetics route is authenticated-only, server-side", () => {
  it.each([
    ["GET /phonetics", (b: Built, c?: string) => listPhonetics(b, c)],
    ["GET /phonetics/topics", (b: Built, c?: string) => getTopics(b, c)],
    ["GET /phonetics/:phoneticId", (b: Built, c?: string) => getRepresentation(b, c, "pl-ipa-ts")],
    ["POST /phonetics/:phoneticId/view", (b: Built, c?: string) => act(b, "view", c, "pl-ipa-ts")],
    [
      "POST /phonetics/:phoneticId/practice",
      (b: Built, c?: string) => act(b, "practice", c, "pl-ipa-ts"),
    ],
    [
      "POST /phonetics/:phoneticId/complete",
      (b: Built, c?: string) => act(b, "complete", c, "pl-ipa-ts"),
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
      expect(built.userPhoneticProgressRepository.writeCalls).toBe(0);
    },
  );
});

describe("GET /phonetics", () => {
  it("lists the published representations of the language, each with the caller's own (not_started) progress", async () => {
    const built = build();
    const { cookie } = await signIn(built, "ana@example.com");

    const response = await listPhonetics(built, cookie);

    expect(response.statusCode).toBe(200);
    const body: PhoneticListResponse = response.json();
    expect(body.items.map((item) => item.id)).toEqual(["pl-ipa-ts", "pl-ipa-a", "pl-ipa-no-topic"]);
    expect(body.items[0]?.userProgress).toEqual({
      status: "not_started",
      firstViewedAt: null,
      lastViewedAt: null,
      practicedAt: null,
      completedAt: null,
    });
    expect(body.total).toBe(3);
  });

  it("excludes a draft representation and one hidden behind a draft topic", async () => {
    const built = build();
    const { cookie } = await signIn(built, "ana@example.com");

    const body: PhoneticListResponse = (await listPhonetics(built, cookie)).json();

    expect(body.items.map((i) => i.id)).not.toContain("pl-ipa-draft");
    expect(body.items.map((i) => i.id)).not.toContain("pl-ipa-hidden");
  });

  it("filters by topic", async () => {
    const built = build();
    const { cookie } = await signIn(built, "ana@example.com");

    const body: PhoneticListResponse = (
      await listPhonetics(built, cookie, "language=pl&topic=vowels")
    ).json();

    expect(body.items.map((i) => i.id)).toEqual(["pl-ipa-a"]);
  });

  it("returns 400 for a malformed query, including a userId", async () => {
    const built = build();
    const { cookie } = await signIn(built, "ana@example.com");

    const noLanguage = await listPhonetics(built, cookie, "level=a1");
    const badStatus = await listPhonetics(built, cookie, "language=pl&status=mastered");
    const withUserId = await listPhonetics(built, cookie, "language=pl&userId=someone-else");

    for (const response of [noLanguage, badStatus, withUserId]) {
      expect(response.statusCode).toBe(400);
    }
  });

  it("returns 404 for an inactive or unknown language", async () => {
    const built = build();
    const { cookie } = await signIn(built, "ana@example.com");

    const response = await listPhonetics(built, cookie, "language=zz");

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({ error: "Language not found." });
  });
});

describe("GET /phonetics/topics", () => {
  it("lists the language's published topics with progress", async () => {
    const built = build();
    const { cookie } = await signIn(built, "ana@example.com");

    const response = await getTopics(built, cookie);

    expect(response.statusCode).toBe(200);
    const body: PhoneticTopicsResponse = response.json();
    expect(body.topics.map((t) => t.id)).toEqual(["consonants", "vowels"]);
  });
});

describe("GET /phonetics/:phoneticId", () => {
  it("returns one representation with its topic title and the caller's progress", async () => {
    const built = build();
    const { cookie } = await signIn(built, "ana@example.com");

    const response = await getRepresentation(built, cookie, "pl-ipa-ts");

    expect(response.statusCode).toBe(200);
    const body: PhoneticRepresentationResponse = response.json();
    expect(body.ipa).toBe("t͡ʂ");
    expect(body.topic).toEqual({ id: "consonants", title: expect.any(String) as string });
  });

  it("returns 404 for a draft representation, a missing one, and a malformed id — never distinguishing them", async () => {
    const built = build();
    const { cookie } = await signIn(built, "ana@example.com");

    const draft = await getRepresentation(built, cookie, "pl-ipa-draft");
    const missing = await getRepresentation(built, cookie, "pl-ipa-nope");
    const malformed = await getRepresentation(built, cookie, "Pl-Ipa-Ts");

    for (const response of [draft, missing]) {
      expect(response.statusCode).toBe(404);
      expect(response.json()).toEqual({ error: "Phonetic representation not found." });
    }
    expect(malformed.statusCode).toBe(400);
  });
});

describe("recording view, practice and completion", () => {
  it("views a representation, then practices it, then completes it", async () => {
    const built = build();
    const { cookie } = await signIn(built, "ana@example.com");

    const viewed: PhoneticUserProgressResponse = (
      await act(built, "view", cookie, "pl-ipa-ts")
    ).json();
    expect(viewed.status).toBe("viewed");

    const practiced: PhoneticUserProgressResponse = (
      await act(built, "practice", cookie, "pl-ipa-ts")
    ).json();
    expect(practiced.status).toBe("practiced");

    const completed: PhoneticUserProgressResponse = (
      await act(built, "complete", cookie, "pl-ipa-ts")
    ).json();
    expect(completed.status).toBe("completed");
    expect(completed.completedAt).not.toBeNull();
  });

  it("does not create a duplicate record when viewing twice", async () => {
    const built = build();
    const { cookie } = await signIn(built, "ana@example.com");

    await act(built, "view", cookie, "pl-ipa-ts");
    await act(built, "view", cookie, "pl-ipa-ts");

    expect(
      built.userPhoneticProgressRepository.records.filter(
        (r) => r.phoneticRepresentationId === "pl-ipa-ts",
      ),
    ).toHaveLength(1);
  });

  it("is idempotent: completing twice keeps the original completion time", async () => {
    const built = build();
    const { cookie } = await signIn(built, "ana@example.com");

    const first: PhoneticUserProgressResponse = (
      await act(built, "complete", cookie, "pl-ipa-ts")
    ).json();
    const second: PhoneticUserProgressResponse = (
      await act(built, "complete", cookie, "pl-ipa-ts")
    ).json();

    expect(second.completedAt).toBe(first.completedAt);
  });

  it("refuses a body on view/practice/complete instead of ignoring it", async () => {
    const built = build();
    const { cookie } = await signIn(built, "ana@example.com");

    const response = await act(built, "view", cookie, "pl-ipa-ts", { payload: { userId: "x" } });

    expect(response.statusCode).toBe(400);
    expect(built.userPhoneticProgressRepository.writeCalls).toBe(0);
  });

  it("returns 404 for a representation that is not visible, and writes nothing", async () => {
    const built = build();
    const { cookie } = await signIn(built, "ana@example.com");

    const response = await act(built, "view", cookie, "pl-ipa-draft");

    expect(response.statusCode).toBe(404);
    expect(built.userPhoneticProgressRepository.writeCalls).toBe(0);
  });

  it("returns 403 for a cross-origin write, and writes nothing", async () => {
    const built = build();
    const { cookie } = await signIn(built, "ana@example.com");

    const response = await act(built, "view", cookie, "pl-ipa-ts", {
      headers: { origin: "https://evil.example.com" },
    });

    expect(response.statusCode).toBe(403);
    expect(built.userPhoneticProgressRepository.writeCalls).toBe(0);
  });
});

describe("ownership — a student never sees or changes another student's phonetics progress", () => {
  it("a completed representation does not appear in another student's progress", async () => {
    const built = build();
    const owner = await signIn(built, "owner@example.com");
    const other = await signIn(built, "other@example.com");
    await act(built, "complete", owner.cookie, "pl-ipa-ts");

    const othersDetail: PhoneticRepresentationResponse = (
      await getRepresentation(built, other.cookie, "pl-ipa-ts")
    ).json();

    expect(othersDetail.userProgress.status).toBe("not_started");
  });
});
