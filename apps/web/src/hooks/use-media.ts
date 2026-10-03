import { skipToken, useQuery } from "@tanstack/react-query";

import {
  fetchGrammarMedia,
  fetchLessonMedia,
  fetchMediaIndex,
  fetchVocabularyMedia,
} from "../services/media-api.js";

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

/** A grammar topic's recorded forms, as a text → clip URL lookup. */
export function useGrammarMedia(topicId: string | undefined) {
  return useQuery({
    queryKey: [MEDIA_QUERY_KEY_ROOT, "grammar", topicId],
    queryFn: topicId === undefined ? skipToken : () => fetchGrammarMedia(topicId),
    staleTime: STALE_MS,
    retry: false,
    select: (data) => new Map(data.audio.map((clip) => [clip.text, clip.url])),
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
