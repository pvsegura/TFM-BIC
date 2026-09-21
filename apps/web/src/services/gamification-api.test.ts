import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  fetchAchievements,
  fetchGamificationSummary,
  fetchPointHistory,
} from "./gamification-api.js";

const ACHIEVEMENT = {
  key: "first-exercise",
  title: "First exercise",
  description: "Answer an exercise correctly for the first time.",
  iconId: "spark",
  rewardPoints: 50,
  unlocked: true,
  unlockedAt: "2026-01-01T12:00:00.000Z",
  progress: { current: 1, target: 1 },
};

const TRANSACTION = {
  id: 2,
  amount: 50,
  reason: "achievement-unlocked",
  sourceId: "first-exercise",
  title: "First exercise",
  createdAt: "2026-01-01T12:00:00.000Z",
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

describe("fetchGamificationSummary", () => {
  const SUMMARY = {
    totalPoints: 60,
    achievements: { unlockedCount: 1, totalCount: 4 },
    inProgressAchievements: [],
    recentTransactions: [TRANSACTION],
  };

  it("GETs /gamification/summary with the session cookie, asking for JSON, and sends nothing else", async () => {
    stub(200, SUMMARY);

    const result = await fetchGamificationSummary();

    expect(result.totalPoints).toBe(60);
    const { url, init } = lastCall();
    expect(url).toBe("/gamification/summary");
    expect(init.credentials).toBe("include");
    expect(init.headers).toMatchObject({ Accept: "application/json" });
    expect(init.method).toBeUndefined();
    expect(init.body).toBeUndefined();
  });

  it("never names a user: the session is the only identity", async () => {
    stub(200, SUMMARY);

    await fetchGamificationSummary();

    expect(JSON.stringify(lastCall())).not.toMatch(/user/i);
  });

  it("drops anything the contract does not name, such as a user id", async () => {
    stub(200, {
      ...SUMMARY,
      userId: "user-1",
      recentTransactions: [{ ...TRANSACTION, userId: "u" }],
    });

    const result = await fetchGamificationSummary();

    expect(JSON.stringify(result)).not.toContain("userId");
  });

  it("rejects a response that is not a valid summary", async () => {
    stub(200, { totalPoints: -5 });

    await expect(fetchGamificationSummary()).rejects.toThrow();
  });

  it("throws an ApiError with the status, for a session that ended or a server failure", async () => {
    stub(401, { error: "Unauthenticated" });
    await expect(fetchGamificationSummary()).rejects.toMatchObject({ status: 401 });

    stub(500, { error: "Internal Server Error" });
    await expect(fetchGamificationSummary()).rejects.toMatchObject({ status: 500 });
  });
});

describe("fetchAchievements", () => {
  it("GETs /gamification/achievements and returns the list with its counts", async () => {
    stub(200, { achievements: [ACHIEVEMENT], unlockedCount: 1, totalCount: 4 });

    const result = await fetchAchievements();

    expect(result.achievements).toHaveLength(1);
    expect(result.totalCount).toBe(4);
    expect(lastCall().url).toBe("/gamification/achievements");
    expect(lastCall().init.credentials).toBe("include");
  });

  it("rejects an achievement with an icon this version does not know", async () => {
    stub(200, {
      achievements: [{ ...ACHIEVEMENT, iconId: "../../evil.svg" }],
      unlockedCount: 1,
      totalCount: 1,
    });

    await expect(fetchAchievements()).rejects.toThrow();
  });
});

describe("fetchPointHistory", () => {
  it("GETs the first page with no parameters at all", async () => {
    stub(200, { transactions: [TRANSACTION], nextBefore: null });

    const result = await fetchPointHistory();

    expect(result.transactions).toHaveLength(1);
    expect(lastCall().url).toBe("/gamification/point-transactions");
  });

  it("asks for the next page with the cursor the server gave, and only that", async () => {
    stub(200, { transactions: [], nextBefore: null });

    await fetchPointHistory(41);

    expect(lastCall().url).toBe("/gamification/point-transactions?before=41");
  });

  it("does not let a cursor add parameters to the request", async () => {
    stub(200, { transactions: [], nextBefore: null });

    await fetchPointHistory(Number.NaN);

    expect(lastCall().url).toBe("/gamification/point-transactions");
  });

  it("keeps the cursor the server returned for the page after", async () => {
    stub(200, { transactions: [TRANSACTION], nextBefore: 2 });

    expect((await fetchPointHistory()).nextBefore).toBe(2);
  });
});
