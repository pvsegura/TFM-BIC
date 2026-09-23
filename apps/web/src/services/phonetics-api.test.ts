import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "./api-error.js";
import {
  completePhonetic,
  fetchPhonetic,
  fetchPhonetics,
  fetchPhoneticTopics,
  recordPhoneticPractice,
  recordPhoneticView,
} from "./phonetics-api.js";

const USER_PROGRESS = {
  status: "not_started",
  firstViewedAt: null,
  lastViewedAt: null,
  practicedAt: null,
  completedAt: null,
};

const REPRESENTATION = {
  id: "pl-ipa-ts",
  languageId: "pl",
  topic: { id: "consonants", title: "Consonants" },
  ipa: "t͡ʂ",
  description: "Voiceless retroflex affricate.",
  instructionLanguage: "en",
  userProgress: USER_PROGRESS,
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

describe("fetchPhonetics", () => {
  it("GETs the language's phonetics with the session cookie, asking for JSON", async () => {
    stub(200, { items: [REPRESENTATION], total: 1, nextAfter: null });

    const result = await fetchPhonetics("pl");

    expect(result.items[0]?.id).toBe("pl-ipa-ts");
    const { url, init } = lastCall();
    expect(url).toBe("/phonetics?language=pl");
    expect(init.credentials).toBe("include");
    expect(init.headers).toMatchObject({ Accept: "application/json" });
  });

  it("adds every filter to the query string", async () => {
    stub(200, { items: [], total: 0, nextAfter: null });

    await fetchPhonetics("pl", {
      level: "a1",
      topic: "consonants",
      status: "viewed",
      limit: 10,
    });

    const params = new URL(lastCall().url, "http://x").searchParams;
    expect(params.get("level")).toBe("a1");
    expect(params.get("topic")).toBe("consonants");
    expect(params.get("status")).toBe("viewed");
    expect(params.get("limit")).toBe("10");
  });

  it("throws an ApiError carrying the API's safe message and status", async () => {
    stub(404, { error: "Language not found." });

    const failure = await fetchPhonetics("zz").catch((e: unknown) => e);

    expect(failure).toBeInstanceOf(ApiError);
    expect(failure).toMatchObject({ status: 404, message: "Language not found." });
  });
});

describe("fetchPhoneticTopics", () => {
  it("GETs the language's topics", async () => {
    stub(200, {
      topics: [
        {
          id: "consonants",
          languageId: "pl",
          title: "Consonants",
          instructionLanguage: "en",
          progress: { representationCount: 1, viewed: 0, practiced: 0, completed: 0 },
        },
      ],
    });

    const result = await fetchPhoneticTopics("pl");

    expect(result.topics[0]?.id).toBe("consonants");
    expect(lastCall().url).toBe("/phonetics/topics?language=pl");
  });
});

describe("fetchPhonetic", () => {
  it("GETs one representation, percent-encoding the id", async () => {
    stub(200, REPRESENTATION);

    await fetchPhonetic("pl/../x");

    expect(lastCall().url).toBe("/phonetics/pl%2F..%2Fx");
  });

  it("drops anything beyond the response shape", async () => {
    stub(200, { ...REPRESENTATION, status: "published", filePath: "content/x.json" });

    const representation = await fetchPhonetic("pl-ipa-ts");

    expect(JSON.stringify(representation)).not.toMatch(/filePath|published/);
  });
});

describe("write actions", () => {
  it.each([
    ["view", () => recordPhoneticView("pl-ipa-ts"), "/phonetics/pl-ipa-ts/view"],
    ["practice", () => recordPhoneticPractice("pl-ipa-ts"), "/phonetics/pl-ipa-ts/practice"],
    ["complete", () => completePhonetic("pl-ipa-ts"), "/phonetics/pl-ipa-ts/complete"],
  ])("%s POSTs with no body", async (_name, call, expectedUrl) => {
    stub(200, USER_PROGRESS);

    await call();

    const { url, init } = lastCall();
    expect(url).toBe(expectedUrl);
    expect(init.method).toBe("POST");
    expect(init.body).toBeUndefined();
  });

  it("falls back to a generic message when an error body is not the expected shape", async () => {
    stub(500, "<html>boom</html>");

    const failure = await recordPhoneticView("pl-ipa-ts").catch((e: unknown) => e);

    expect(failure).toMatchObject({
      status: 500,
      message: "Something went wrong. Please try again.",
    });
  });
});
