import { skipToken, useQuery } from "@tanstack/react-query";

import { fetchLessonMedia, fetchMediaIndex, fetchVocabularyMedia } from "../services/media-api.js";

export const MEDIA_QUERY_KEY_ROOT = "media";

/**
 * Published media is read-only and changes only when the operator publishes a new batch (M21), so
 * it is cached for a few minutes like the catalog. Fetching it never generates anything.
 */
const STALE_MS = 5 * 60 * 1000;

export function useLessonMedia(lessonId: string | undefined) {
  return useQuery({
    queryKey: [MEDIA_QUERY_KEY_ROOT, "lesson", lessonId],
    queryFn: lessonId === undefined ? skipToken : () => fetchLessonMedia(lessonId),
    staleTime: STALE_MS,
    retry: 1,
  });
}

export function useVocabularyMedia(vocabularyId: string | undefined) {
  return useQuery({
    queryKey: [MEDIA_QUERY_KEY_ROOT, "vocabulary", vocabularyId],
    queryFn: vocabularyId === undefined ? skipToken : () => fetchVocabularyMedia(vocabularyId),
    staleTime: STALE_MS,
    retry: 1,
  });
}

/** Lookup of which content has a published video (and its poster/duration), by `type:id`. */
export function useMediaIndex() {
  return useQuery({
    queryKey: [MEDIA_QUERY_KEY_ROOT, "index"],
    queryFn: fetchMediaIndex,
    staleTime: STALE_MS,
    retry: 1,
    select: (data) =>
      new Map(data.items.map((item) => [`${item.contentType}:${item.contentId}`, item])),
  });
}
