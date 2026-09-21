import { describe, expect, it } from "vitest";

import {
  achievementResponseSchema,
  achievementsResponseSchema,
  gamificationSummaryResponseSchema,
  pointHistoryQuerySchema,
  pointHistoryResponseSchema,
  pointTransactionResponseSchema,
  rewardsResponseSchema,
} from "./gamification-response.schema.js";

const achievement = {
  key: "first-exercise",
  title: "First exercise",
  description: "Complete your first exercise correctly.",
  iconId: "spark",
  rewardPoints: 50,
  unlocked: true,
  unlockedAt: "2026-01-01T10:00:00.000Z",
  progress: { current: 1, target: 1 },
};

const transaction = {
  id: 7,
  amount: 10,
  reason: "exercise-completed",
  sourceId: "pl-greetings-polite-hello",
  title: null,
  createdAt: "2026-01-01T10:00:00.000Z",
};

describe("rewardsResponseSchema", () => {
  it("accepts a reward with points and unlocked achievements", () => {
    const parsed = rewardsResponseSchema.parse({
      pointsAwarded: 60,
      achievementsUnlocked: [
        {
          key: "first-exercise",
          title: "First exercise",
          description: "Complete your first exercise correctly.",
          iconId: "spark",
          rewardPoints: 50,
        },
      ],
    });
    expect(parsed.pointsAwarded).toBe(60);
    expect(parsed.achievementsUnlocked).toHaveLength(1);
  });

  it("accepts no reward at all (a repeat, or a wrong answer)", () => {
    expect(rewardsResponseSchema.parse({ pointsAwarded: 0, achievementsUnlocked: [] })).toEqual({
      pointsAwarded: 0,
      achievementsUnlocked: [],
    });
  });

  it.each([-1, 1.5, "10", null])("rejects %j as the points awarded", (pointsAwarded) => {
    expect(
      rewardsResponseSchema.safeParse({ pointsAwarded, achievementsUnlocked: [] }).success,
    ).toBe(false);
  });

  it("rejects an achievement with a malformed key or an unknown icon", () => {
    const bad = (override: object) =>
      rewardsResponseSchema.safeParse({
        pointsAwarded: 50,
        achievementsUnlocked: [
          {
            key: "ok-key",
            title: "t",
            description: "d",
            iconId: "spark",
            rewardPoints: 50,
            ...override,
          },
        ],
      }).success;

    expect(bad({})).toBe(true);
    expect(bad({ key: "Not A Key" })).toBe(false);
    expect(bad({ iconId: "../../evil.svg" })).toBe(false);
  });
});

describe("pointTransactionResponseSchema", () => {
  it("accepts a ledger line", () => {
    expect(pointTransactionResponseSchema.parse(transaction)).toEqual(transaction);
  });

  it("strips anything beyond the documented shape, such as the user id (allowlist)", () => {
    const parsed = pointTransactionResponseSchema.parse({ ...transaction, userId: "user-1" });
    expect(parsed).not.toHaveProperty("userId");
  });

  it.each([
    ["an unknown reason", { reason: "give-me-points" }],
    ["a zero amount", { amount: 0 }],
    ["a negative amount", { amount: -10 }],
    ["a fractional amount", { amount: 2.5 }],
    ["a malformed source id", { sourceId: "x'; DROP TABLE point_transactions;--" }],
    ["a time that is not an ISO date-time", { createdAt: "yesterday" }],
  ])("rejects %s", (_name, override) => {
    expect(pointTransactionResponseSchema.safeParse({ ...transaction, ...override }).success).toBe(
      false,
    );
  });
});

describe("achievementResponseSchema", () => {
  it("accepts an unlocked achievement", () => {
    expect(achievementResponseSchema.parse(achievement)).toEqual(achievement);
  });

  it("accepts a locked one, with no unlock time and partial progress", () => {
    const locked = {
      ...achievement,
      unlocked: false,
      unlockedAt: null,
      progress: { current: 3, target: 10 },
    };
    expect(achievementResponseSchema.parse(locked)).toEqual(locked);
  });

  it("rejects negative progress", () => {
    expect(
      achievementResponseSchema.safeParse({ ...achievement, progress: { current: -1, target: 1 } })
        .success,
    ).toBe(false);
  });
});

describe("achievementsResponseSchema and the summary", () => {
  it("carries the list with its counts", () => {
    const parsed = achievementsResponseSchema.parse({
      achievements: [achievement],
      unlockedCount: 1,
      totalCount: 4,
    });
    expect(parsed.totalCount).toBe(4);
  });

  it("carries total points, achievement counts, what is in progress and recent points", () => {
    const parsed = gamificationSummaryResponseSchema.parse({
      totalPoints: 60,
      achievements: { unlockedCount: 1, totalCount: 4 },
      inProgressAchievements: [
        { ...achievement, unlocked: false, unlockedAt: null, progress: { current: 3, target: 10 } },
      ],
      recentTransactions: [transaction],
    });
    expect(parsed.totalPoints).toBe(60);
    expect(parsed.recentTransactions).toHaveLength(1);
  });

  it("rejects negative total points", () => {
    expect(
      gamificationSummaryResponseSchema.safeParse({
        totalPoints: -1,
        achievements: { unlockedCount: 0, totalCount: 4 },
        inProgressAchievements: [],
        recentTransactions: [],
      }).success,
    ).toBe(false);
  });
});

describe("point history paging", () => {
  it("defaults to the first page of 20", () => {
    expect(pointHistoryQuerySchema.parse({})).toEqual({ limit: 20 });
  });

  it("reads a limit and a cursor from the query string", () => {
    expect(pointHistoryQuerySchema.parse({ limit: "5", before: "42" })).toEqual({
      limit: 5,
      before: 42,
    });
  });

  it.each([
    { limit: "0" },
    { limit: "51" },
    { limit: "-1" },
    { limit: "abc" },
    { limit: "1e2" },
    { limit: "2.5" },
    { limit: ["1", "2"] },
    { before: "0" },
    { before: "-3" },
    { before: "abc" },
    { before: "9".repeat(12) },
  ])("rejects %j", (query) => {
    expect(pointHistoryQuerySchema.safeParse(query).success).toBe(false);
  });

  it("returns a page with the cursor for the next one, or none at the end", () => {
    expect(
      pointHistoryResponseSchema.parse({ transactions: [transaction], nextBefore: 7 }).nextBefore,
    ).toBe(7);
    expect(
      pointHistoryResponseSchema.parse({ transactions: [], nextBefore: null }).nextBefore,
    ).toBeNull();
  });
});
