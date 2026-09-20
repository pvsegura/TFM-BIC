import type { QueryClient } from "@tanstack/react-query";

import { ApiError } from "../services/api-error.js";
import { CURRENT_USER_QUERY_KEY } from "./use-current-user.js";

const AUTH_QUERY_KEY_ROOT = CURRENT_USER_QUERY_KEY[0];

/**
 * Removes every cached query except the auth query. By convention everything
 * else in the cache (the student profile today, lessons/progress later) is
 * scoped to the signed-in user, so none of it may outlive that user's session
 * — otherwise the next person to sign in on the same browser tab would be
 * served (even briefly, as a stale-while-revalidate flash) the previous
 * person's personal data.
 */
export function clearUserScopedCache(queryClient: QueryClient): void {
  queryClient.removeQueries({
    predicate: (query) => query.queryKey[0] !== AUTH_QUERY_KEY_ROOT,
  });
}

/**
 * An API `401` from a user-scoped request means the session is gone (expired,
 * revoked, or logged out elsewhere): record that, so `ProtectedRoute`
 * redirects to the login page, and drop the user's cached data. Any other
 * error — including a network failure — says nothing about the session and is
 * left to the caller.
 */
export function endSessionIfUnauthorized(queryClient: QueryClient, error: unknown): void {
  if (error instanceof ApiError && error.status === 401) {
    clearUserScopedCache(queryClient);
    queryClient.setQueryData(CURRENT_USER_QUERY_KEY, null);
  }
}
