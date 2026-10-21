import { skipToken, useQuery, useQueryClient, type QueryKey } from "@tanstack/react-query";

import { endingSessionOnUnauthorized } from "./session-cache.js";

/**
 * A query for the signed-in user's own data. Idle while `request` is `undefined` (the page does not
 * know what to ask for yet); a `401` ends the session (`endingSessionOnUnauthorized`); never
 * retried — a refused request would be refused again, and a failure shows a retry button instead.
 */
export function useUserScopedQuery<T>(
  queryKey: QueryKey,
  request: (() => Promise<T>) | undefined,
  options: { refetchOnWindowFocus?: boolean } = {},
) {
  const queryClient = useQueryClient();
  return useQuery({
    queryKey,
    queryFn:
      request === undefined ? skipToken : () => endingSessionOnUnauthorized(queryClient, request),
    retry: false,
    ...options,
  });
}
