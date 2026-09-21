import type { AchievementsResponse, GamificationSummaryResponse } from "@tfm-bic/contracts";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "../services/api-error.js";
import * as gamificationApi from "../services/gamification-api.js";
import { clearUserScopedCache } from "./session-cache.js";
import { CURRENT_USER_QUERY_KEY } from "./use-current-user.js";
import {
  GAMIFICATION_QUERY_KEY_ROOT,
  invalidateGamification,
  useAchievements,
  useGamificationSummary,
  usePointHistory,
} from "./use-gamification.js";

function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { client, wrapper };
}

const SUMMARY: GamificationSummaryResponse = {
  totalPoints: 60,
  achievements: { unlockedCount: 1, totalCount: 4 },
  inProgressAchievements: [],
  recentTransactions: [],
};
const ACHIEVEMENTS: AchievementsResponse = { achievements: [], unlockedCount: 0, totalCount: 4 };

const tx = (id: number) => ({
  id,
  amount: 10,
  reason: "exercise-completed" as const,
  sourceId: `pl-ex-${String(id)}`,
  title: null,
  createdAt: "2026-01-01T12:00:00.000Z",
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useGamificationSummary", () => {
  it("loads the summary under a user-scoped key", async () => {
    const spy = vi.spyOn(gamificationApi, "fetchGamificationSummary").mockResolvedValue(SUMMARY);
    const { client, wrapper } = setup();

    const { result } = renderHook(() => useGamificationSummary(), { wrapper });

    await waitFor(() => {
      expect(result.current.data).toEqual(SUMMARY);
    });
    expect(spy).toHaveBeenCalledTimes(1);
    expect(client.getQueryCache().getAll()[0]?.queryKey[0]).toBe(GAMIFICATION_QUERY_KEY_ROOT);
  });

  it("is dropped with the rest of the user's data on logout, so the next student never sees it", async () => {
    vi.spyOn(gamificationApi, "fetchGamificationSummary").mockResolvedValue(SUMMARY);
    const { client, wrapper } = setup();
    client.setQueryData(CURRENT_USER_QUERY_KEY, { id: "user-1" });
    const { result } = renderHook(() => useGamificationSummary(), { wrapper });
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    clearUserScopedCache(client);

    expect(client.getQueryData([GAMIFICATION_QUERY_KEY_ROOT, "summary"])).toBeUndefined();
    expect(client.getQueryData(CURRENT_USER_QUERY_KEY)).toEqual({ id: "user-1" });
  });

  it("treats points as changing: coming back to the page shows the cache at once and refreshes it", async () => {
    const spy = vi.spyOn(gamificationApi, "fetchGamificationSummary").mockResolvedValue(SUMMARY);
    const { wrapper } = setup();
    const first = renderHook(() => useGamificationSummary(), { wrapper });
    await waitFor(() => {
      expect(first.result.current.isSuccess).toBe(true);
    });
    first.unmount();

    renderHook(() => useGamificationSummary(), { wrapper });

    await waitFor(() => {
      expect(spy).toHaveBeenCalledTimes(2);
    });
  });

  it("records a 401 as an ended session, so the student is sent to log in", async () => {
    vi.spyOn(gamificationApi, "fetchGamificationSummary").mockRejectedValue(
      new ApiError("Unauthenticated", 401),
    );
    const { client, wrapper } = setup();
    client.setQueryData(CURRENT_USER_QUERY_KEY, { id: "user-1" });

    const { result } = renderHook(() => useGamificationSummary(), { wrapper });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect(client.getQueryData(CURRENT_USER_QUERY_KEY)).toBeNull();
  });

  it("leaves the session alone for any other failure, and does not retry it", async () => {
    const spy = vi
      .spyOn(gamificationApi, "fetchGamificationSummary")
      .mockRejectedValue(new ApiError("Something went wrong. Please try again.", 500));
    const { client, wrapper } = setup();
    client.setQueryData(CURRENT_USER_QUERY_KEY, { id: "user-1" });

    const { result } = renderHook(() => useGamificationSummary(), { wrapper });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect(client.getQueryData(CURRENT_USER_QUERY_KEY)).toEqual({ id: "user-1" });
    expect(spy).toHaveBeenCalledTimes(1);
  });
});

describe("useAchievements", () => {
  it("loads the achievements", async () => {
    vi.spyOn(gamificationApi, "fetchAchievements").mockResolvedValue(ACHIEVEMENTS);
    const { wrapper } = setup();

    const { result } = renderHook(() => useAchievements(), { wrapper });

    await waitFor(() => {
      expect(result.current.data).toEqual(ACHIEVEMENTS);
    });
  });
});

describe("usePointHistory", () => {
  it("loads the first page without a cursor, then follows the cursor the server gives", async () => {
    const spy = vi
      .spyOn(gamificationApi, "fetchPointHistory")
      .mockResolvedValueOnce({
        transactions: [tx(3), tx(2)],
        nextBefore: 2,
      })
      .mockResolvedValueOnce({ transactions: [tx(1)], nextBefore: null });
    const { wrapper } = setup();
    const { result } = renderHook(() => usePointHistory(), { wrapper });

    await waitFor(() => {
      expect(result.current.data?.pages).toHaveLength(1);
    });
    expect(spy).toHaveBeenNthCalledWith(1, undefined);
    expect(result.current.hasNextPage).toBe(true);

    act(() => {
      void result.current.fetchNextPage();
    });

    await waitFor(() => {
      expect(result.current.data?.pages).toHaveLength(2);
    });
    expect(spy).toHaveBeenNthCalledWith(2, 2);
    expect(result.current.data?.pages.flatMap((p) => p.transactions.map((t) => t.id))).toEqual([
      3, 2, 1,
    ]);
    expect(result.current.hasNextPage).toBe(false);
  });
});

describe("invalidateGamification", () => {
  it("marks every cached gamification query stale, so a reward shows up at once", async () => {
    const summarySpy = vi
      .spyOn(gamificationApi, "fetchGamificationSummary")
      .mockResolvedValue(SUMMARY);
    const { client, wrapper } = setup();
    const { result } = renderHook(() => useGamificationSummary(), { wrapper });
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    await act(async () => {
      await invalidateGamification(client);
    });

    expect(summarySpy).toHaveBeenCalledTimes(2);
  });

  it("leaves other cached data alone", async () => {
    const { client } = setup();
    client.setQueryData(["lessons", "list"], [1]);

    await invalidateGamification(client);

    expect(client.getQueryState(["lessons", "list"])?.isInvalidated).toBe(false);
  });
});
