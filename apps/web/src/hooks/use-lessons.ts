import type { LessonProgressResponse, LessonResponse } from "@tfm-bic/contracts";
import {
  skipToken,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";

import { completeLesson, fetchLesson, fetchLessons, startLesson } from "../services/lessons-api.js";
import { endSessionIfUnauthorized } from "./session-cache.js";

/**
 * Query-key root for lessons. Everything under it is the signed-in student's own
 * data (their progress is part of every lesson response), so — unlike the public
 * `["catalog", …]` root — it is *not* session-independent: `clearUserScopedCache`
 * drops it on logout and login.
 */
export const LESSONS_QUERY_KEY_ROOT = "lessons";

const detailKey = (lessonId: string) => [LESSONS_QUERY_KEY_ROOT, "detail", lessonId] as const;

/** Runs a request and, if the API says the session is gone (`401`), records it so
 * `ProtectedRoute` redirects to log in. Any other error is left to the caller. */
async function endingSessionOnUnauthorized<T>(
  queryClient: QueryClient,
  request: () => Promise<T>,
): Promise<T> {
  try {
    return await request();
  } catch (error) {
    endSessionIfUnauthorized(queryClient, error);
    throw error;
  }
}

/**
 * The lessons of one language and level with the student's progress — server
 * state, owned by TanStack Query, never copied into Zustand. Progress changes,
 * so no long stale time: coming back to the list shows the cached data at once
 * and refreshes it. Retries are off so a not-found or an ended session shows
 * straight away. Idle until a language and level are known.
 */
export function useLessons(languageCode: string | undefined, levelId: string | undefined) {
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: [LESSONS_QUERY_KEY_ROOT, "list", languageCode, levelId],
    queryFn:
      languageCode === undefined || levelId === undefined
        ? skipToken
        : () => endingSessionOnUnauthorized(queryClient, () => fetchLessons(languageCode, levelId)),
    retry: false,
  });
}

/** One lesson with its blocks and the student's progress. Idle without an id. */
export function useLesson(lessonId: string | undefined) {
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: [LESSONS_QUERY_KEY_ROOT, "detail", lessonId],
    queryFn:
      lessonId === undefined
        ? skipToken
        : () => endingSessionOnUnauthorized(queryClient, () => fetchLesson(lessonId)),
    retry: false,
    // The page holds the lesson while it is read; a background refetch on focus
    // would only re-request text that has not changed.
    refetchOnWindowFocus: false,
  });
}

/**
 * After a progress change the server's answer is the truth: it is written into
 * the cached lesson (no extra request), and every cached list is marked stale so
 * the next look at it shows the persisted state — nothing is guessed locally.
 */
function applyPersistedProgress(
  queryClient: QueryClient,
  lessonId: string,
  progress: LessonProgressResponse,
): void {
  queryClient.setQueryData<LessonResponse>(detailKey(lessonId), (lesson) =>
    lesson ? { ...lesson, progress } : lesson,
  );
  void queryClient.invalidateQueries({ queryKey: [LESSONS_QUERY_KEY_ROOT, "list"] });
}

function useProgressMutation(action: (lessonId: string) => Promise<LessonProgressResponse>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: action,
    onSuccess: (progress, lessonId) => {
      applyPersistedProgress(queryClient, lessonId, progress);
    },
    onError: (error) => {
      endSessionIfUnauthorized(queryClient, error);
    },
  });
}

/** Records that the student opened a lesson. Idempotent on the server. */
export function useStartLesson() {
  return useProgressMutation(startLesson);
}

/** The explicit completion action. Idempotent on the server, so a repeat is harmless. */
export function useCompleteLesson() {
  return useProgressMutation(completeLesson);
}
