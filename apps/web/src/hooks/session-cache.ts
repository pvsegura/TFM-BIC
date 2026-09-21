import type { QueryClient } from "@tanstack/react-query";

import { ApiError } from "../services/api-error.js";
import { CATALOG_QUERY_KEY_ROOT } from "./use-catalog.js";
import { CURRENT_USER_QUERY_KEY } from "./use-current-user.js";

const AUTH_QUERY_KEY_ROOT = CURRENT_USER_QUERY_KEY[0];

/** Roots that survive a session change: the auth query itself, and the public
 * language/content catalog, which belongs to no user. */
const SESSION_INDEPENDENT_ROOTS: readonly unknown[] = [AUTH_QUERY_KEY_ROOT, CATALOG_QUERY_KEY_ROOT];

/**
 * Removes every cached query except the auth query and the public catalog. By
 * convention everything else in the cache (the student profile and the lessons with their progress) is
 * scoped to the signed-in user, so none of it may outlive that user's session
 * — otherwise the next person to sign in on the same browser tab would be
 * served (even briefly, as a stale-while-revalidate flash) the previous
 * person's personal data.
 */
export function clearUserScopedCache(queryClient: QueryClient): void {
  queryClient.removeQueries({
    predicate: (query) => !SESSION_INDEPENDENT_ROOTS.includes(query.queryKey[0]),
  });
}

/**
 * Runs a user-scoped request and, if the API says the session is gone (`401`), records it (see
 * `endSessionIfUnauthorized`). Any other error is left to the caller, and every error is rethrown.
 */
export async function endingSessionOnUnauthorized<T>(
  queryClient: QueryClient,
  request: () => Promise<T>,
): Promise<T> {
  try {
    return await request();
  } catch (error) {
    endSessionIfUnauthorized(queryClient, error);
    throw error;
  }
}

/**
 * An API `401` from a user-scoped request means the session is gone (expired,
 * revoked, or logged out elsewhere): record that, so `ProtectedRoute`
 * redirects to the login page. Any other error — including a network failure
 * — says nothing about the session and is left to the caller.
 *
 * Deliberately does not clear the cache here: this runs inside a failing
 * query's own `queryFn`, and removing that in-flight query would leave its
 * observer stuck. It is not needed either — the only way a new session starts
 * is `useLogin`, which calls `clearUserScopedCache` before setting the user.
 */
export function endSessionIfUnauthorized(queryClient: QueryClient, error: unknown): void {
  if (error instanceof ApiError && error.status === 401) {
    queryClient.setQueryData(CURRENT_USER_QUERY_KEY, null);
  }
}
