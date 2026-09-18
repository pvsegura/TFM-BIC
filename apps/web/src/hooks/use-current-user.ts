import { useQuery } from "@tanstack/react-query";

import { fetchCurrentUser } from "../services/auth-api.js";

export const CURRENT_USER_QUERY_KEY = ["auth", "me"] as const;

/** Restores authentication state on load — `data` is `undefined` while
 * loading, `null` when anonymous, or the current user. Route guards use
 * `isPending` to show a loading state instead of redirecting prematurely
 * (see components/protected-route.tsx). */
export function useCurrentUser() {
  return useQuery({
    queryKey: CURRENT_USER_QUERY_KEY,
    queryFn: fetchCurrentUser,
    staleTime: 60_000,
    retry: false,
  });
}
