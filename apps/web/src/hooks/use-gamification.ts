import {
  useInfiniteQuery,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";

import {
  fetchAchievements,
  fetchGamificationSummary,
  fetchPointHistory,
} from "../services/gamification-api.js";
import { endingSessionOnUnauthorized } from "./session-cache.js";

/**
 * Query-key root for gamification. Everything under it is the signed-in student's own points and
 * achievements, so — unlike the public `["catalog", …]` root — it is *not* session-independent:
 * `clearUserScopedCache` drops it on logout and login. It is server state, owned by TanStack
 * Query and never copied into Zustand.
 */
export const GAMIFICATION_QUERY_KEY_ROOT = "gamification";

/**
 * The student's total, achievement counts and recent rewards. Points change as the student
 * works, so there is no long stale time: coming back to the page shows the cached data at once
 * and refreshes it. Retries are off so an ended session or a server failure shows straight away.
 */
export function useGamificationSummary() {
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: [GAMIFICATION_QUERY_KEY_ROOT, "summary"],
    queryFn: () => endingSessionOnUnauthorized(queryClient, fetchGamificationSummary),
    retry: false,
  });
}

export function useAchievements() {
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: [GAMIFICATION_QUERY_KEY_ROOT, "achievements"],
    queryFn: () => endingSessionOnUnauthorized(queryClient, fetchAchievements),
    retry: false,
  });
}

/**
 * The points history, newest first, a page at a time. The cursor is exactly what the server
 * returned (`nextBefore`); the client never computes one.
 */
export function usePointHistory() {
  const queryClient = useQueryClient();
  return useInfiniteQuery({
    queryKey: [GAMIFICATION_QUERY_KEY_ROOT, "history"],
    queryFn: ({ pageParam }) =>
      endingSessionOnUnauthorized(queryClient, () => fetchPointHistory(pageParam)),
    initialPageParam: undefined as number | undefined,
    getNextPageParam: (lastPage) => lastPage.nextBefore ?? undefined,
    retry: false,
  });
}

/**
 * After an action that earned something (a correct answer, a completed lesson) every cached
 * gamification query is stale: the next look at the dashboard, the achievements or the history
 * shows what the server stored. Nothing is guessed locally.
 */
export function invalidateGamification(queryClient: QueryClient): Promise<void> {
  return queryClient.invalidateQueries({ queryKey: [GAMIFICATION_QUERY_KEY_ROOT] });
}
