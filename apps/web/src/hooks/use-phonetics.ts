import type {
  PhoneticRepresentationResponse,
  PhoneticUserProgressResponse,
} from "@tfm-bic/contracts";
import {
  skipToken,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import { useCallback, useRef } from "react";

import {
  completePhonetic,
  fetchPhonetic,
  fetchPhonetics,
  fetchPhoneticTopics,
  recordPhoneticPractice,
  recordPhoneticView,
  type PhoneticFilters,
} from "../services/phonetics-api.js";
import { endingSessionOnUnauthorized, endSessionIfUnauthorized } from "./session-cache.js";

/**
 * Query-key root for phonetics. Every route is authenticated and every response carries the
 * student's own progress, so — unlike the public `["catalog", …]` root — this is *not*
 * session-independent: `clearUserScopedCache` drops it on logout and login, same as vocabulary.
 */
export const PHONETICS_QUERY_KEY_ROOT = "phonetics";

const LIST_KEY = [PHONETICS_QUERY_KEY_ROOT, "list"] as const;
const TOPICS_KEY = [PHONETICS_QUERY_KEY_ROOT, "topics"] as const;
const detailKey = (phoneticId: string) => [PHONETICS_QUERY_KEY_ROOT, "detail", phoneticId] as const;

/** The phonetics of one language a student can browse, filtered and paged, each representation
 * with the student's own progress. Idle until a language is known. */
export function usePhonetics(languageCode: string | undefined, filters: PhoneticFilters = {}) {
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: [...LIST_KEY, languageCode, filters],
    queryFn:
      languageCode === undefined
        ? skipToken
        : () =>
            endingSessionOnUnauthorized(queryClient, () => fetchPhonetics(languageCode, filters)),
    retry: false,
  });
}

/** A language's phonetics topics, each with the student's progress, and the language's total. */
export function usePhoneticTopics(languageCode: string | undefined) {
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: [...TOPICS_KEY, languageCode],
    queryFn:
      languageCode === undefined
        ? skipToken
        : () => endingSessionOnUnauthorized(queryClient, () => fetchPhoneticTopics(languageCode)),
    retry: false,
  });
}

/** One representation with its topic and the student's progress. Idle without an id. */
export function usePhonetic(phoneticId: string | undefined) {
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: detailKey(phoneticId ?? ""),
    queryFn:
      phoneticId === undefined
        ? skipToken
        : () => endingSessionOnUnauthorized(queryClient, () => fetchPhonetic(phoneticId)),
    retry: false,
    // The representation itself does not change while it is on screen; a background refetch on
    // focus would only re-request the same content.
    refetchOnWindowFocus: false,
  });
}

/**
 * After an action the server's answer is the truth: it is written into the cached detail (when
 * that representation is cached — no extra request) and every browse/topics query is marked
 * stale, so the next look at any of them shows the persisted progress. Nothing is guessed locally.
 */
function applyPersistedProgress(
  queryClient: QueryClient,
  phoneticId: string,
  progress: PhoneticUserProgressResponse,
): void {
  queryClient.setQueryData<PhoneticRepresentationResponse>(detailKey(phoneticId), (entry) =>
    entry ? { ...entry, userProgress: progress } : entry,
  );
  void queryClient.invalidateQueries({ queryKey: LIST_KEY });
  void queryClient.invalidateQueries({ queryKey: TOPICS_KEY });
}

/**
 * Wraps one phonetics action (view, practice, complete) with the shared behaviour every one of
 * them needs: the server's progress persisted into the cache, at most one request in flight
 * (`isPending` is published a moment after a click, so a disabled button alone would let a
 * double-click through), and the session ended on a `401`.
 */
function usePhoneticAction(action: (phoneticId: string) => Promise<PhoneticUserProgressResponse>) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: action,
    onSuccess: (progress, phoneticId) => {
      applyPersistedProgress(queryClient, phoneticId, progress);
    },
    onError: (error) => {
      endSessionIfUnauthorized(queryClient, error);
    },
  });

  const inFlight = useRef(false);
  const { mutate } = mutation;
  const mutateOnce = useCallback(
    (phoneticId: string) => {
      if (inFlight.current) {
        return;
      }
      inFlight.current = true;
      mutate(phoneticId, {
        onSettled: () => {
          inFlight.current = false;
        },
      });
    },
    [mutate],
  );

  return { ...mutation, mutate: mutateOnce };
}

/** Records a view. Idempotent on the server; never regresses a further-along representation. */
export function useRecordPhoneticView() {
  return usePhoneticAction(recordPhoneticView);
}

/** Records practice. Idempotent on the server; never regresses a completed representation. */
export function useRecordPhoneticPractice() {
  return usePhoneticAction(recordPhoneticPractice);
}

/** Marks a representation completed. Idempotent; never refused. */
export function useCompletePhonetic() {
  return usePhoneticAction(completePhonetic);
}
