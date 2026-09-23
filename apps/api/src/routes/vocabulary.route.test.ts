import { loadEnv } from "@tfm-bic/config";
import type {
  VocabularyCategoriesResponse,
  VocabularyItemResponse,
  VocabularyListResponse,
  VocabularyUserStateResponse,
} from "@tfm-bic/contracts";
import { makeVocabularyCatalog } from "@tfm-bic/application/testing";
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
  const catalog = makeVocabularyCatalog();
  testDeps.contentRepository.catalog = catalog;
  testDeps.vocabularyRepository.categories = [...catalog.vocabularyCategories];
  testDeps.vocabularyRepository.items = [...catalog.vocabulary];
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

function listVocabulary(built: Built, cookie: string | undefined, query = "language=pl") {
  return built.app.inject({ method: "GET", url: `/vocabulary?${query}`, ...cookiesOf(cookie) });
}

function getCategories(built: Built, cookie: string | undefined, query = "language=pl") {
  return built.app.inject({
    method: "GET",
    url: `/vocabulary/categories?${query}`,
    ...cookiesOf(cookie),
  });
}

function getItem(built: Built, cookie: string | undefined, id: string) {
  return built.app.inject({ method: "GET", url: `/vocabulary/${id}`, ...cookiesOf(cookie) });
}

function listMine(built: Built, cookie: string | undefined, query = "language=pl") {
  return built.app.inject({
    method: "GET",
    url: `/user-vocabulary?${query}`,
    ...cookiesOf(cookie),
  });
}

function act(
  built: Built,
  action: "save" | "unsave" | "learned",
  cookie: string | undefined,
  id: string,
  options: { payload?: unknown; headers?: Record<string, string> } = {},
) {
  return built.app.inject({
    method: "POST",
    url: `/vocabulary/${id}/${action}`,
    ...(options.payload === undefined ? {} : { payload: options.payload as object }),
    ...(options.headers ? { headers: options.headers } : {}),
    ...cookiesOf(cookie),
  });
}

function putStatus(
  built: Built,
  cookie: string | undefined,
  id: string,
  payload: unknown,
  headers?: Record<string, string>,
) {
  return built.app.inject({
    method: "PUT",
    url: `/vocabulary/${id}/status`,
    payload: payload as object,
    ...(headers ? { headers } : {}),
    ...cookiesOf(cookie),
  });
}

describe("authentication — every vocabulary route is authenticated-only, server-side", () => {
  it.each([
    ["GET /vocabulary", (b: Built, c?: string) => listVocabulary(b, c)],
    ["GET /vocabulary/categories", (b: Built, c?: string) => getCategories(b, c)],
    ["GET /vocabulary/:vocabularyId", (b: Built, c?: string) => getItem(b, c, "pl-dom")],
    ["GET /user-vocabulary", (b: Built, c?: string) => listMine(b, c)],
    ["POST /vocabulary/:vocabularyId/save", (b: Built, c?: string) => act(b, "save", c, "pl-dom")],
    [
      "POST /vocabulary/:vocabularyId/unsave",
      (b: Built, c?: string) => act(b, "unsave", c, "pl-dom"),
    ],
    [
      "POST /vocabulary/:vocabularyId/learned",
      (b: Built, c?: string) => act(b, "learned", c, "pl-dom"),
    ],
    [
      "PUT /vocabulary/:vocabularyId/status",
      (b: Built, c?: string) => putStatus(b, c, "pl-dom", { status: "saved" }),
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
      expect(built.userVocabularyRepository.writeCalls).toBe(0);
    },
  );
});

describe("GET /vocabulary", () => {
  it("lists the published entries of the language, each with the caller's own (new) state", async () => {
    const built = build();
    const { cookie } = await signIn(built, "ana@example.com");

    const response = await listVocabulary(built, cookie);

    expect(response.statusCode).toBe(200);
    const body: VocabularyListResponse = response.json();
    expect(body.items.map((item) => item.id)).toEqual(["pl-dom", "pl-kot", "pl-chleb"]);
    expect(body.items[0]?.userState).toEqual({
      status: "new",
      createdAt: null,
      updatedAt: null,
      learnedAt: null,
    });
    expect(body.total).toBe(3);
  });

  it("excludes a draft entry and one hidden behind a draft category", async () => {
    const built = build();
    const { cookie } = await signIn(built, "ana@example.com");

    const body: VocabularyListResponse = (await listVocabulary(built, cookie)).json();

    expect(body.items.map((i) => i.id)).not.toContain("pl-draft-word");
    expect(body.items.map((i) => i.id)).not.toContain("pl-hidden");
  });

  it("filters by category and by search term", async () => {
    const built = build();
    const { cookie } = await signIn(built, "ana@example.com");

    const byCategory: VocabularyListResponse = (
      await listVocabulary(built, cookie, "language=pl&category=food")
    ).json();
    const bySearch: VocabularyListResponse = (
      await listVocabulary(built, cookie, "language=pl&q=dom")
    ).json();

    expect(byCategory.items.map((i) => i.id)).toEqual(["pl-chleb"]);
    expect(bySearch.items.map((i) => i.id)).toEqual(["pl-dom"]);
  });

  it("returns 400 for a malformed query, including a userId", async () => {
    const built = build();
    const { cookie } = await signIn(built, "ana@example.com");

    const noLanguage = await listVocabulary(built, cookie, "level=a1");
    const badStatus = await listVocabulary(built, cookie, "language=pl&status=mastered");
    const withUserId = await listVocabulary(built, cookie, "language=pl&userId=someone-else");

    for (const response of [noLanguage, badStatus, withUserId]) {
      expect(response.statusCode).toBe(400);
    }
  });

  it("returns 404 for an inactive or unknown language", async () => {
    const built = build();
    const { cookie } = await signIn(built, "ana@example.com");

    const response = await listVocabulary(built, cookie, "language=zz");

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({ error: "Language not found." });
  });
});

describe("GET /vocabulary/categories", () => {
  it("lists the language's published categories with progress", async () => {
    const built = build();
    const { cookie } = await signIn(built, "ana@example.com");

    const response = await getCategories(built, cookie);

    expect(response.statusCode).toBe(200);
    const body: VocabularyCategoriesResponse = response.json();
    expect(body.categories.map((c) => c.id)).toEqual(["greetings", "food"]);
    expect(body.progress).toEqual({ itemCount: 3, saved: 0, learning: 0, learned: 0 });
  });
});

describe("GET /vocabulary/:vocabularyId", () => {
  it("returns one entry with its category title and the caller's state", async () => {
    const built = build();
    const { cookie } = await signIn(built, "ana@example.com");

    const response = await getItem(built, cookie, "pl-dom");

    expect(response.statusCode).toBe(200);
    const body: VocabularyItemResponse = response.json();
    expect(body.lemma).toBe("dom");
    expect(body.category).toEqual({ id: "greetings", title: expect.any(String) as string });
  });

  it("returns 404 for a draft entry, a missing one, and a malformed id — never distinguishing them", async () => {
    const built = build();
    const { cookie } = await signIn(built, "ana@example.com");

    const draft = await getItem(built, cookie, "pl-draft-word");
    const missing = await getItem(built, cookie, "pl-nope");
    const malformed = await getItem(built, cookie, "Pl-Dom");

    for (const response of [draft, missing]) {
      expect(response.statusCode).toBe(404);
      expect(response.json()).toEqual({ error: "Vocabulary item not found." });
    }
    expect(malformed.statusCode).toBe(400);
  });
});

describe("saving, unsaving and marking a word learned", () => {
  it("saves a word, lists it under My Vocabulary, then unsaves it back to new", async () => {
    const built = build();
    const { cookie } = await signIn(built, "ana@example.com");

    const saved: VocabularyUserStateResponse = (await act(built, "save", cookie, "pl-dom")).json();
    expect(saved.status).toBe("saved");

    const mine: VocabularyListResponse = (await listMine(built, cookie)).json();
    expect(mine.items.map((i) => i.id)).toEqual(["pl-dom"]);

    const unsaved: VocabularyUserStateResponse = (
      await act(built, "unsave", cookie, "pl-dom")
    ).json();
    expect(unsaved).toEqual({ status: "new", createdAt: null, updatedAt: null, learnedAt: null });

    const mineAfter: VocabularyListResponse = (await listMine(built, cookie)).json();
    expect(mineAfter.items).toEqual([]);
  });

  it("does not create a duplicate when saving twice", async () => {
    const built = build();
    const { cookie } = await signIn(built, "ana@example.com");

    await act(built, "save", cookie, "pl-dom");
    await act(built, "save", cookie, "pl-dom");

    expect(
      built.userVocabularyRepository.records.filter((r) => r.vocabularyItemId === "pl-dom"),
    ).toHaveLength(1);
  });

  it("marks a word learned, stamping learnedAt", async () => {
    const built = build();
    const { cookie } = await signIn(built, "ana@example.com");

    const response = await act(built, "learned", cookie, "pl-dom");

    expect(response.statusCode).toBe(200);
    const body: VocabularyUserStateResponse = response.json();
    expect(body.status).toBe("learned");
    expect(body.learnedAt).not.toBeNull();
  });

  it("refuses a body on save/unsave/learned instead of ignoring it", async () => {
    const built = build();
    const { cookie } = await signIn(built, "ana@example.com");

    const response = await act(built, "save", cookie, "pl-dom", { payload: { userId: "x" } });

    expect(response.statusCode).toBe(400);
    expect(built.userVocabularyRepository.writeCalls).toBe(0);
  });

  it("returns 404 for a word that is not visible, and writes nothing", async () => {
    const built = build();
    const { cookie } = await signIn(built, "ana@example.com");

    const response = await act(built, "save", cookie, "pl-draft-word");

    expect(response.statusCode).toBe(404);
    expect(built.userVocabularyRepository.writeCalls).toBe(0);
  });

  it("returns 403 for a cross-origin write, and writes nothing", async () => {
    const built = build();
    const { cookie } = await signIn(built, "ana@example.com");

    const response = await act(built, "save", cookie, "pl-dom", {
      headers: { origin: "https://evil.example.com" },
    });

    expect(response.statusCode).toBe(403);
    expect(built.userVocabularyRepository.writeCalls).toBe(0);
  });
});

describe("PUT /vocabulary/:vocabularyId/status", () => {
  it("sets the status directly", async () => {
    const built = build();
    const { cookie } = await signIn(built, "ana@example.com");

    const response = await putStatus(built, cookie, "pl-dom", { status: "learning" });

    expect(response.statusCode).toBe(200);
    const body: VocabularyUserStateResponse = response.json();
    expect(body.status).toBe("learning");
  });

  it("returns 409 for a refused step back, leaving the record as it was", async () => {
    const built = build();
    const { user, cookie } = await signIn(built, "ana@example.com");
    await act(built, "learned", cookie, "pl-dom");

    const response = await putStatus(built, cookie, "pl-dom", { status: "saved" });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toEqual({ error: "Invalid vocabulary status change." });
    const entry = await built.userVocabularyRepository.findByUserAndItem(
      user.id,
      "pl-dom" as never,
    );
    expect(entry?.status).toBe("learned");
  });

  it("returns 400 for an unknown status or an extra key, never ignoring it", async () => {
    const built = build();
    const { cookie } = await signIn(built, "ana@example.com");

    const unknown = await putStatus(built, cookie, "pl-dom", { status: "mastered" });
    const extraKey = await putStatus(built, cookie, "pl-dom", { status: "saved", userId: "x" });

    expect(unknown.statusCode).toBe(400);
    expect(extraKey.statusCode).toBe(400);
  });
});

describe("ownership — a student never sees or changes another student's vocabulary", () => {
  it("a saved word does not appear in another student's My Vocabulary or detail state", async () => {
    const built = build();
    const owner = await signIn(built, "owner@example.com");
    const other = await signIn(built, "other@example.com");
    await act(built, "save", owner.cookie, "pl-dom");

    const othersMine: VocabularyListResponse = (await listMine(built, other.cookie)).json();
    const othersDetail: VocabularyItemResponse = (
      await getItem(built, other.cookie, "pl-dom")
    ).json();

    expect(othersMine.items).toEqual([]);
    expect(othersDetail.userState.status).toBe("new");
  });
});
