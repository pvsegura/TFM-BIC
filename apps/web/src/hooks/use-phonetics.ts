import type {
  PhoneticRepresentationResponse,
  PhoneticUserProgressResponse,
} from "@tfm-bic/contracts";
import { useMutation, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";

import {
  completePhonetic,
  fetchPhonetic,
  fetchPhonetics,
  fetchPhoneticTopics,
  recordPhoneticPractice,
  recordPhoneticView,
  type PhoneticFilters,
} from "../services/phonetics-api.js";
import { endSessionIfUnauthorized } from "./session-cache.js";
import { useUserScopedQuery } from "./use-user-scoped-query.js";
import { useSingleFlight } from "./use-single-flight.js";

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
  return useUserScopedQuery(
    [...LIST_KEY, languageCode, filters],
    languageCode === undefined ? undefined : () => fetchPhonetics(languageCode, filters),
  );
}

/** A language's phonetics topics, each with the student's progress, and the language's total. */
export function usePhoneticTopics(languageCode: string | undefined) {
  return useUserScopedQuery(
    [...TOPICS_KEY, languageCode],
    languageCode === undefined ? undefined : () => fetchPhoneticTopics(languageCode),
  );
}

/** One representation with its topic and the student's progress. Idle without an id. */
export function usePhonetic(phoneticId: string | undefined) {
  return useUserScopedQuery(
    detailKey(phoneticId ?? ""),
    phoneticId === undefined ? undefined : () => fetchPhonetic(phoneticId),
    {
      // The representation itself does not change while it is on screen; a background refetch on
      // focus would only re-request the same content.
      refetchOnWindowFocus: false,
    },
  );
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

  return useSingleFlight(mutation);
}

/** Records a view. Idempotent on the server; never regresses a further-along representation. */
export function useRecordPhoneticView() {
  return usePhoneticAction((phoneticId: string) => recordPhoneticView(phoneticId));
}

/**
 * Records a view as soon as a representation is loaded — the way opening a lesson starts it
 * (`useStartLessonOnOpen`). Unlike a lesson's one-time start, a view is recorded on every fresh
 * open of a representation's id (never regressing a `practiced`/`completed` one on the server,
 * see `recordPhoneticView`'s domain rule), but only once per mount for that id — a re-render never
 * fires it again.
 */
export function useRecordPhoneticViewOnOpen(
  representation: PhoneticRepresentationResponse | undefined,
): void {
  const { mutate: recordView } = useRecordPhoneticView();
  const requestedFor = useRef<string | null>(null);

  useEffect(() => {
    const id = representation?.id;
    if (id !== undefined && requestedFor.current !== id) {
      requestedFor.current = id;
      recordView(id);
    }
  }, [representation?.id, recordView]);
}

/** Records practice. Idempotent on the server; never regresses a completed representation. */
export function useRecordPhoneticPractice() {
  return usePhoneticAction((phoneticId: string) => recordPhoneticPractice(phoneticId));
}

/** Marks a representation completed. Idempotent; never refused. */
export function useCompletePhonetic() {
  return usePhoneticAction((phoneticId: string) => completePhonetic(phoneticId));
}
