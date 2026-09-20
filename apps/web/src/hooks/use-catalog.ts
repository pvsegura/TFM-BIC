import { skipToken, useQuery } from "@tanstack/react-query";

import {
  fetchContent,
  fetchContentList,
  fetchLanguageLevels,
  fetchLanguages,
} from "../services/catalog-api.js";

/**
 * Query-key root for the public language/content catalog. Unlike every other
 * cached query it is not user-scoped, so `clearUserScopedCache` keeps it (see
 * session-cache.ts).
 */
export const CATALOG_QUERY_KEY_ROOT = "catalog";

/** Catalog metadata only changes with a new release, so it is treated as
 * stable: served from cache for ten minutes and never refetched just because
 * the window regained focus. One caching system — TanStack Query — no other. */
const CATALOG_QUERY_OPTIONS = {
  staleTime: 10 * 60_000,
  retry: false,
  refetchOnWindowFocus: false,
} as const;

export function useLanguages() {
  return useQuery({
    queryKey: [CATALOG_QUERY_KEY_ROOT, "languages"],
    queryFn: fetchLanguages,
    ...CATALOG_QUERY_OPTIONS,
  });
}

/** Idle (no request) until a language code is known. */
export function useLanguageLevels(languageCode: string | undefined) {
  return useQuery({
    queryKey: [CATALOG_QUERY_KEY_ROOT, "levels", languageCode],
    queryFn: languageCode === undefined ? skipToken : () => fetchLanguageLevels(languageCode),
    ...CATALOG_QUERY_OPTIONS,
  });
}

/** Idle until a language and level are known *and* `enabled` — the caller
 * enables it only for a level the catalog says is available. */
export function useContentList(
  languageCode: string | undefined,
  levelId: string | undefined,
  enabled: boolean,
) {
  return useQuery({
    queryKey: [CATALOG_QUERY_KEY_ROOT, "content", languageCode, levelId],
    queryFn:
      enabled && languageCode !== undefined && levelId !== undefined
        ? () => fetchContentList(languageCode, levelId)
        : skipToken,
    ...CATALOG_QUERY_OPTIONS,
  });
}

export function useContentItem(contentId: string | undefined) {
  return useQuery({
    queryKey: [CATALOG_QUERY_KEY_ROOT, "item", contentId],
    queryFn: contentId === undefined ? skipToken : () => fetchContent(contentId),
    ...CATALOG_QUERY_OPTIONS,
  });
}
