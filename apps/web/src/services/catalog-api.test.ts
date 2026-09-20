import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "./api-error.js";
import {
  fetchContent,
  fetchContentList,
  fetchLanguageLevels,
  fetchLanguages,
} from "./catalog-api.js";

const LANGUAGE = {
  code: "pl",
  name: "Polish",
  nativeName: "polski",
  locale: "pl-PL",
  direction: "ltr",
};

const SUMMARY = {
  id: "pl-greetings",
  languageId: "pl",
  levelId: "a1",
  type: "lesson",
  title: "Greetings",
  description: "Say hello.",
  order: 10,
  instructionLanguage: "en",
};

function mockFetch(status: number, body: unknown) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  });
}

function stub(status: number, body: unknown) {
  vi.stubGlobal("fetch", mockFetch(status, body));
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("catalog API client", () => {
  beforeEach(() => {
    stub(200, {});
  });

  it("fetchLanguages GETs /languages asking for JSON and returns the parsed list", async () => {
    stub(200, { languages: [LANGUAGE] });

    const languages = await fetchLanguages();

    expect(languages.languages[0]?.code).toBe("pl");
    expect(fetch).toHaveBeenCalledWith(
      "/languages",
      expect.objectContaining({
        headers: expect.objectContaining({ Accept: "application/json" }) as unknown,
      }),
    );
  });

  it("is public: it never sends credentials or a user id", async () => {
    stub(200, { languages: [] });

    await fetchLanguages();

    const [, init] = vi.mocked(fetch).mock.calls[0] ?? [];
    expect(init).not.toHaveProperty("credentials");
  });

  it("fetchLanguageLevels GETs the levels of one language", async () => {
    stub(200, {
      language: LANGUAGE,
      levels: [{ id: "a1", label: "A1", status: "available" }],
    });

    const result = await fetchLanguageLevels("pl");

    expect(result.levels).toEqual([{ id: "a1", label: "A1", status: "available" }]);
    expect(vi.mocked(fetch).mock.calls[0]?.[0]).toBe("/languages/pl/levels");
  });

  it("fetchContentList sends language and level as query parameters", async () => {
    stub(200, { items: [SUMMARY] });

    const result = await fetchContentList("pl", "a1");

    expect(result.items).toHaveLength(1);
    expect(vi.mocked(fetch).mock.calls[0]?.[0]).toBe("/content?language=pl&level=a1");
  });

  it("fetchContent GETs one item with its blocks", async () => {
    stub(200, { ...SUMMARY, blocks: [{ type: "explanation", text: "Hello." }] });

    const item = await fetchContent("pl-greetings");

    expect(item.blocks).toEqual([{ type: "explanation", text: "Hello." }]);
    expect(vi.mocked(fetch).mock.calls[0]?.[0]).toBe("/content/pl-greetings");
  });

  it("percent-encodes path and query values so a route param cannot alter the request", async () => {
    stub(404, { error: "Language not found." });

    await fetchLanguageLevels("../x?y=z#").catch(() => undefined);
    await fetchContentList("a&level=c2", "a1#").catch(() => undefined);
    await fetchContent("a/b").catch(() => undefined);

    const urls = vi.mocked(fetch).mock.calls.map((call) => call[0]);
    expect(urls[0]).toBe("/languages/..%2Fx%3Fy%3Dz%23/levels");
    expect(urls[1]).toBe("/content?language=a%26level%3Dc2&level=a1%23");
    expect(urls[2]).toBe("/content/a%2Fb");
  });

  it.each([400, 404, 429, 500])("throws an ApiError carrying the status %i", async (status) => {
    stub(status, { error: "Language not found." });

    const error = await fetchLanguages().catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(status);
  });

  it("uses the API's safe message when it sends one, and a generic one otherwise", async () => {
    stub(404, { error: "Language not found." });
    expect(((await fetchLanguages().catch((e: unknown) => e)) as ApiError).message).toBe(
      "Language not found.",
    );

    stub(500, "<html>Bad gateway</html>");
    const generic = (await fetchLanguages().catch((e: unknown) => e)) as ApiError;
    expect(generic.message).toBe("Something went wrong. Please try again.");
    expect(generic.message).not.toContain("html");
  });

  it("rejects a response that does not match the contract, instead of trusting it", async () => {
    stub(200, { languages: [{ code: "pl" }] });

    await expect(fetchLanguages()).rejects.toThrow();
  });

  it("rejects a content item containing a block type it does not know", async () => {
    stub(200, { ...SUMMARY, blocks: [{ type: "script", code: "alert(1)" }] });

    await expect(fetchContent("pl-greetings")).rejects.toThrow();
  });

  it("falls back to the generic message when an error body is not JSON at all", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 502,
        json: () => Promise.reject(new SyntaxError("Unexpected token <")),
      }),
    );

    const error = (await fetchLanguages().catch((e: unknown) => e)) as ApiError;

    expect(error.status).toBe(502);
    expect(error.message).toBe("Something went wrong. Please try again.");
  });
});
