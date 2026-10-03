import { skipToken, useQuery } from "@tanstack/react-query";

import { fetchGrammarTopic, fetchGrammarTopics } from "../services/grammar-api.js";

/**
 * The grammar reference (M23) is public, read-only content that changes only with a deploy, so —
 * like the catalog — it is session-independent and cached for a while.
 */
const STALE_MS = 10 * 60 * 1000;

export function useGrammarTopics(languageCode: string | undefined) {
  return useQuery({
    queryKey: ["grammar", "list", languageCode],
    queryFn: languageCode === undefined ? skipToken : () => fetchGrammarTopics(languageCode),
    staleTime: STALE_MS,
    retry: 1,
  });
}

export function useGrammarTopic(topicId: string | undefined) {
  return useQuery({
    queryKey: ["grammar", "topic", topicId],
    queryFn: topicId === undefined ? skipToken : () => fetchGrammarTopic(topicId),
    staleTime: STALE_MS,
    retry: false,
  });
}
