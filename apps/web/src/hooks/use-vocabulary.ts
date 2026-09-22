import type {
  VocabularyItemResponse,
  VocabularyStatusRequest,
  VocabularyUserStateResponse,
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
  fetchUserVocabulary,
  fetchVocabulary,
  fetchVocabularyCategories,
  fetchVocabularyItem,
  markVocabularyItemLearned,
  saveVocabularyItem,
  unsaveVocabularyItem,
  updateVocabularyStatus,
  type VocabularyFilters,
} from "../services/vocabulary-api.js";
import { endingSessionOnUnauthorized, endSessionIfUnauthorized } from "./session-cache.js";

/**
 * Query-key root for vocabulary. Every route is authenticated and every response carries the
 * student's own state, so — unlike the public `["catalog", …]` root — this is *not*
 * session-independent: `clearUserScopedCache` drops it on logout and login, same as lessons and
 * exercises.
 */
export const VOCABULARY_QUERY_KEY_ROOT = "vocabulary";

const LIST_KEY = [VOCABULARY_QUERY_KEY_ROOT, "list"] as const;
const MINE_KEY = [VOCABULARY_QUERY_KEY_ROOT, "mine"] as const;
const CATEGORIES_KEY = [VOCABULARY_QUERY_KEY_ROOT, "categories"] as const;
const detailKey = (vocabularyId: string) =>
  [VOCABULARY_QUERY_KEY_ROOT, "detail", vocabularyId] as const;

/** The vocabulary of one language a student can browse, filtered, searched and paged, each entry
 * with the student's own state. Idle until a language is known. */
export function useVocabulary(languageCode: string | undefined, filters: VocabularyFilters = {}) {
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: [...LIST_KEY, languageCode, filters],
    queryFn:
      languageCode === undefined
        ? skipToken
        : () =>
            endingSessionOnUnauthorized(queryClient, () => fetchVocabulary(languageCode, filters)),
    retry: false,
  });
}

/** "My Vocabulary": only the words the student has touched. Idle until a language is known. */
export function useUserVocabulary(
  languageCode: string | undefined,
  filters: VocabularyFilters = {},
) {
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: [...MINE_KEY, languageCode, filters],
    queryFn:
      languageCode === undefined
        ? skipToken
        : () =>
            endingSessionOnUnauthorized(queryClient, () =>
              fetchUserVocabulary(languageCode, filters),
            ),
    retry: false,
  });
}

/** A language's vocabulary topics, each with the student's progress, and the language's total. */
export function useVocabularyCategories(languageCode: string | undefined) {
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: [...CATEGORIES_KEY, languageCode],
    queryFn:
      languageCode === undefined
        ? skipToken
        : () =>
            endingSessionOnUnauthorized(queryClient, () => fetchVocabularyCategories(languageCode)),
    retry: false,
  });
}

/** One entry with its category and the student's state. Idle without an id. */
export function useVocabularyItem(vocabularyId: string | undefined) {
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: detailKey(vocabularyId ?? ""),
    queryFn:
      vocabularyId === undefined
        ? skipToken
        : () => endingSessionOnUnauthorized(queryClient, () => fetchVocabularyItem(vocabularyId)),
    retry: false,
    // The entry itself does not change while it is on screen; a background refetch on focus would
    // only re-request the same content.
    refetchOnWindowFocus: false,
  });
}

/**
 * After an action the server's answer is the truth: it is written into the cached detail (when
 * that entry is cached — no extra request) and every browse/My Vocabulary/categories query is
 * marked stale, so the next look at any of them shows the persisted state. Nothing is guessed
 * locally, and the counts a category shows can only come from a real refetch.
 */
function applyPersistedState(
  queryClient: QueryClient,
  vocabularyId: string,
  state: VocabularyUserStateResponse,
): void {
  queryClient.setQueryData<VocabularyItemResponse>(detailKey(vocabularyId), (item) =>
    item ? { ...item, userState: state } : item,
  );
  void queryClient.invalidateQueries({ queryKey: LIST_KEY });
  void queryClient.invalidateQueries({ queryKey: MINE_KEY });
  void queryClient.invalidateQueries({ queryKey: CATEGORIES_KEY });
}

/**
 * Wraps one vocabulary action (save, unsave, mark learned, set status) with the shared behaviour
 * every one of them needs: the server's state persisted into the cache, at most one request in
 * flight (`isPending` is published a moment after a click, so a disabled button alone would let a
 * double-click through), and the session ended on a `401`.
 */
function useVocabularyAction<TInput extends { vocabularyId: string }>(
  action: (input: TInput) => Promise<VocabularyUserStateResponse>,
) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: action,
    onSuccess: (state, { vocabularyId }) => {
      applyPersistedState(queryClient, vocabularyId, state);
    },
    onError: (error) => {
      endSessionIfUnauthorized(queryClient, error);
    },
  });

  const inFlight = useRef(false);
  const { mutate } = mutation;
  const mutateOnce = useCallback(
    (input: TInput) => {
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

/** Puts a word on the list. Idempotent on the server. */
export function useSaveVocabularyItem() {
  const action = useVocabularyAction((input: { vocabularyId: string }) =>
    saveVocabularyItem(input.vocabularyId),
  );
  return { ...action, mutate: (vocabularyId: string) => action.mutate({ vocabularyId }) };
}

/** Takes a word off the list. Idempotent; always resolves to the derived `new` state. */
export function useUnsaveVocabularyItem() {
  const action = useVocabularyAction((input: { vocabularyId: string }) =>
    unsaveVocabularyItem(input.vocabularyId),
  );
  return { ...action, mutate: (vocabularyId: string) => action.mutate({ vocabularyId }) };
}

/** Marks a word known. Idempotent; never refused, whatever the word's current status. */
export function useMarkVocabularyItemLearned() {
  const action = useVocabularyAction((input: { vocabularyId: string }) =>
    markVocabularyItemLearned(input.vocabularyId),
  );
  return { ...action, mutate: (vocabularyId: string) => action.mutate({ vocabularyId }) };
}

export interface UpdateStatusInput {
  vocabularyId: string;
  status: VocabularyStatusRequest["status"];
}

/** Sets a word's status directly. A step the domain refuses answers with an error the caller can show. */
export function useUpdateVocabularyStatus() {
  return useVocabularyAction((input: UpdateStatusInput) =>
    updateVocabularyStatus(input.vocabularyId, input.status),
  );
}
