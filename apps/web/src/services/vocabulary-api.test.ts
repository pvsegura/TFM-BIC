import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "./api-error.js";
import {
  fetchUserVocabulary,
  fetchVocabulary,
  fetchVocabularyCategories,
  fetchVocabularyItem,
  markVocabularyItemLearned,
  saveVocabularyItem,
  unsaveVocabularyItem,
  updateVocabularyStatus,
} from "./vocabulary-api.js";

const USER_STATE = { status: "new", createdAt: null, updatedAt: null, learnedAt: null };

const ITEM = {
  id: "pl-dom",
  languageId: "pl",
  category: { id: "everyday", title: "Everyday life" },
  lemma: "dom",
  translation: "house; home",
  instructionLanguage: "en",
  userState: USER_STATE,
};

function stub(status: number, body: unknown) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: status >= 200 && status < 300,
      status,
      json: () => Promise.resolve(body),
    }),
  );
}

function lastCall() {
  const [url, init] = vi.mocked(fetch).mock.calls[0] ?? [];
  return { url: url as string, init: init ?? {} };
}

beforeEach(() => {
  stub(200, {});
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("fetchVocabulary", () => {
  it("GETs the language's vocabulary with the session cookie, asking for JSON", async () => {
    stub(200, { items: [ITEM], total: 1, nextAfter: null });

    const result = await fetchVocabulary("pl");

    expect(result.items[0]?.id).toBe("pl-dom");
    const { url, init } = lastCall();
    expect(url).toBe("/vocabulary?language=pl");
    expect(init.credentials).toBe("include");
    expect(init.headers).toMatchObject({ Accept: "application/json" });
  });

  it("adds every filter to the query string", async () => {
    stub(200, { items: [], total: 0, nextAfter: null });

    await fetchVocabulary("pl", {
      level: "a1",
      category: "food",
      status: "saved",
      q: "dom",
      limit: 10,
    });

    const params = new URL(lastCall().url, "http://x").searchParams;
    expect(params.get("level")).toBe("a1");
    expect(params.get("category")).toBe("food");
    expect(params.get("status")).toBe("saved");
    expect(params.get("q")).toBe("dom");
    expect(params.get("limit")).toBe("10");
  });

  it("throws an ApiError carrying the API's safe message and status", async () => {
    stub(404, { error: "Language not found." });

    const failure = await fetchVocabulary("zz").catch((e: unknown) => e);

    expect(failure).toBeInstanceOf(ApiError);
    expect(failure).toMatchObject({ status: 404, message: "Language not found." });
  });
});

describe("fetchUserVocabulary", () => {
  it("GETs from /user-vocabulary, not /vocabulary", async () => {
    stub(200, { items: [], total: 0, nextAfter: null });

    await fetchUserVocabulary("pl");

    expect(lastCall().url).toBe("/user-vocabulary?language=pl");
  });
});

describe("fetchVocabularyCategories", () => {
  it("GETs the language's categories", async () => {
    stub(200, {
      categories: [
        {
          id: "food",
          languageId: "pl",
          title: "Food",
          instructionLanguage: "en",
          progress: { itemCount: 1, saved: 0, learning: 0, learned: 0 },
        },
      ],
      progress: { itemCount: 1, saved: 0, learning: 0, learned: 0 },
    });

    const result = await fetchVocabularyCategories("pl");

    expect(result.categories[0]?.id).toBe("food");
    expect(lastCall().url).toBe("/vocabulary/categories?language=pl");
  });
});

describe("fetchVocabularyItem", () => {
  it("GETs one entry, percent-encoding the id", async () => {
    stub(200, ITEM);

    await fetchVocabularyItem("pl/../x");

    expect(lastCall().url).toBe("/vocabulary/pl%2F..%2Fx");
  });

  it("drops anything beyond the response shape", async () => {
    stub(200, { ...ITEM, status: "published", filePath: "content/x.json" });

    const item = await fetchVocabularyItem("pl-dom");

    expect(JSON.stringify(item)).not.toMatch(/filePath|published/);
  });
});

describe("write actions", () => {
  it.each([
    ["save", () => saveVocabularyItem("pl-dom"), "/vocabulary/pl-dom/save"],
    ["unsave", () => unsaveVocabularyItem("pl-dom"), "/vocabulary/pl-dom/unsave"],
    ["learned", () => markVocabularyItemLearned("pl-dom"), "/vocabulary/pl-dom/learned"],
  ])("%s POSTs with no body", async (_name, call, expectedUrl) => {
    stub(200, USER_STATE);

    await call();

    const { url, init } = lastCall();
    expect(url).toBe(expectedUrl);
    expect(init.method).toBe("POST");
    expect(init.body).toBeUndefined();
  });

  it("updateVocabularyStatus PUTs only the status", async () => {
    stub(200, { ...USER_STATE, status: "saved" });

    await updateVocabularyStatus("pl-dom", "saved");

    const { url, init } = lastCall();
    expect(url).toBe("/vocabulary/pl-dom/status");
    expect(init.method).toBe("PUT");
    expect(JSON.parse(init.body as string)).toEqual({ status: "saved" });
  });

  it("falls back to a generic message when an error body is not the expected shape", async () => {
    stub(500, "<html>boom</html>");

    const failure = await saveVocabularyItem("pl-dom").catch((e: unknown) => e);

    expect(failure).toMatchObject({
      status: 500,
      message: "Something went wrong. Please try again.",
    });
  });
});
