import type { LessonProgressResponse, LessonResponse } from "@tfm-bic/contracts";
import {
  skipToken,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import { useCallback, useEffect, useRef } from "react";

import { completeLesson, fetchLesson, fetchLessons, startLesson } from "../services/lessons-api.js";
import { endingSessionOnUnauthorized, endSessionIfUnauthorized } from "./session-cache.js";
import { invalidateGamification } from "./use-gamification.js";

/**
 * Query-key root for lessons. Everything under it is the signed-in student's own
 * data (their progress is part of every lesson response), so — unlike the public
 * `["catalog", …]` root — it is *not* session-independent: `clearUserScopedCache`
 * drops it on logout and login.
 */
export const LESSONS_QUERY_KEY_ROOT = "lessons";

const detailKey = (lessonId: string) => [LESSONS_QUERY_KEY_ROOT, "detail", lessonId] as const;

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

function useProgressMutation<T extends LessonProgressResponse>(
  action: (lessonId: string) => Promise<T>,
  onPersisted?: (result: T) => void,
) {
  const queryClient = useQueryClient();
  return useMutation({
    // Wrapped so the only thing ever passed on is the lesson id (TanStack Query would also hand the
    // mutation context to a bare function).
    mutationFn: (lessonId: string) => action(lessonId),
    onSuccess: (result, lessonId) => {
      // Only the progress goes into the cache: a completion's rewards are shown once, never stored
      // as part of the lesson.
      applyPersistedProgress(queryClient, lessonId, {
        status: result.status,
        startedAt: result.startedAt,
        completedAt: result.completedAt,
      });
      onPersisted?.(result);
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

/**
 * The explicit completion action. It is idempotent on the server, so a repeat
 * could do no harm — but the student should not send one at all. `isPending`
 * only turns true a moment after a click (the mutation state is published
 * asynchronously), and a double-click delivers its second click inside that
 * gap, so a disabled button alone lets two requests through. This keeps at most
 * one in flight and frees the lock when it settles, so a failed attempt can be
 * retried.
 */
export function useCompleteLesson() {
  const queryClient = useQueryClient();
  const mutation = useProgressMutation(completeLesson, ({ rewards }) => {
    // The first completion earned points (and maybe an achievement); a repeat earned none.
    if (rewards.pointsAwarded > 0) {
      void invalidateGamification(queryClient);
    }
  });
  const inFlight = useRef(false);
  const { mutate } = mutation;

  const mutateOnce = useCallback(
    (lessonId: string) => {
      if (inFlight.current) {
        return;
      }
      inFlight.current = true;
      mutate(lessonId, {
        onSettled: () => {
          inFlight.current = false;
        },
      });
    },
    [mutate],
  );

  return { ...mutation, mutate: mutateOnce };
}

/**
 * Opening a lesson starts it: when a lesson the student has not started is on
 * screen, the start is recorded once. A ref remembers which lesson has been
 * sent, so React running effects twice in development (StrictMode) or the lesson
 * being refetched cannot send it again. It is best-effort: if recording fails
 * the lesson stays readable and completable (completing works from
 * "not started" too), and the failure is not shown — the student did nothing
 * wrong and can do nothing about it. It never completes anything.
 */
export function useStartLessonOnOpen(lesson: LessonResponse | undefined): void {
  const { mutate: start } = useStartLesson();
  const requestedFor = useRef<string | null>(null);

  useEffect(() => {
    if (lesson?.progress.status === "not_started" && requestedFor.current !== lesson.id) {
      requestedFor.current = lesson.id;
      start(lesson.id);
    }
  }, [lesson?.id, lesson?.progress.status, start]);
}
