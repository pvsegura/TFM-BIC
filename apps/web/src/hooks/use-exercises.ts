import type { ExerciseAnswerRequest, ExerciseResponse } from "@tfm-bic/contracts";
import { skipToken, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useRef } from "react";

import { fetchExercise, fetchLessonExercises, submitAnswer } from "../services/exercises-api.js";
import { endingSessionOnUnauthorized, endSessionIfUnauthorized } from "./session-cache.js";
import { invalidateGamification } from "./use-gamification.js";

/**
 * Query-key root for exercises. Everything under it carries the signed-in
 * student's own results, so — unlike the public `["catalog", …]` root — it is
 * *not* session-independent: `clearUserScopedCache` drops it on logout and login.
 * Exercise state is server state: it lives here, in TanStack Query, and is never
 * copied into Zustand.
 */
export const EXERCISES_QUERY_KEY_ROOT = "exercises";

const detailKey = (exerciseId: string) => [EXERCISES_QUERY_KEY_ROOT, "detail", exerciseId] as const;
const LIST_KEY = [EXERCISES_QUERY_KEY_ROOT, "list"] as const;

/**
 * The exercises of one lesson, in the server's order, with the student's own
 * results. Results change as the student answers, so there is no long stale time:
 * coming back to the list shows the cached data at once and refreshes it. Retries
 * are off so a not-found or an ended session shows straight away. Idle until a
 * lesson is known. Loaded for the lesson being viewed only — never the whole bank.
 */
export function useLessonExercises(lessonId: string | undefined) {
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: [...LIST_KEY, lessonId],
    queryFn:
      lessonId === undefined
        ? skipToken
        : () => endingSessionOnUnauthorized(queryClient, () => fetchLessonExercises(lessonId)),
    retry: false,
  });
}

/** One exercise as a student may see it before answering, plus their result. Idle without an id. */
export function useExercise(exerciseId: string | undefined) {
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: [EXERCISES_QUERY_KEY_ROOT, "detail", exerciseId],
    queryFn:
      exerciseId === undefined
        ? skipToken
        : () => endingSessionOnUnauthorized(queryClient, () => fetchExercise(exerciseId)),
    retry: false,
    // The exercise itself does not change while it is on screen; a background refetch on focus
    // would only re-request the same prompt.
    refetchOnWindowFocus: false,
  });
}

export interface SubmitAnswerInput {
  exerciseId: string;
  answer: ExerciseAnswerRequest["answer"];
}

/**
 * Submits the student's answer. The server's verdict is the truth: the result it
 * returns is written into the cached exercise (no extra request) and every cached
 * list is marked stale, so the next look at a list shows what was persisted —
 * nothing is guessed locally. The verdict itself is the mutation's `data`, for the
 * result view to show.
 *
 * At most one submission is in flight at a time. `isPending` only turns true a
 * moment after a click (the mutation state is published asynchronously), so a
 * double-click delivers its second click inside that gap and a disabled button
 * alone would let two answers — two attempts — through. The lock is freed when the
 * request settles, so a retry, or another try after a failure, can be submitted.
 */
export function useSubmitAnswer() {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    // Wrapped so the only things ever passed on are the exercise id and the answer
    // (TanStack Query would also hand the mutation context to a bare function).
    mutationFn: ({ exerciseId, answer }: SubmitAnswerInput) => submitAnswer(exerciseId, answer),
    onSuccess: (evaluation, { exerciseId }) => {
      queryClient.setQueryData<ExerciseResponse>(detailKey(exerciseId), (exercise) =>
        exercise ? { ...exercise, result: evaluation.result } : exercise,
      );
      void queryClient.invalidateQueries({ queryKey: LIST_KEY });
      // A correct first answer earned points (and maybe an achievement): the dashboard's total,
      // the achievements and the history are stale until refetched from what the server stored.
      if (evaluation.rewards.pointsAwarded > 0) {
        void invalidateGamification(queryClient);
      }
    },
    onError: (error) => {
      endSessionIfUnauthorized(queryClient, error);
    },
  });

  const inFlight = useRef(false);
  const { mutate } = mutation;

  const mutateOnce = useCallback(
    (input: SubmitAnswerInput) => {
      if (inFlight.current) {
        return;
      }
      inFlight.current = true;
      mutate(input, {
        onSettled: () => {
          inFlight.current = false;
        },
      });
    },
    [mutate],
  );

  return { ...mutation, mutate: mutateOnce };
}
