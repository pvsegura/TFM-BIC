import { useQuery, useQueryClient } from "@tanstack/react-query";

import { fetchCurrentProfile } from "../services/profile-api.js";
import { endSessionIfUnauthorized } from "./session-cache.js";

export const PROFILE_QUERY_KEY = ["profile", "me"] as const;

/**
 * The signed-in student's profile — server state, owned by TanStack Query
 * (not duplicated into Zustand). A `401` means the session ended, which is
 * recorded so `ProtectedRoute` sends the user to the login page.
 *
 * `refetchOnWindowFocus` is off: the form is initialised from this data once,
 * and a background refetch while someone is mid-edit is wasted traffic for
 * data only they can change.
 */
export function useCurrentProfile() {
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: PROFILE_QUERY_KEY,
    queryFn: async () => {
      try {
        return await fetchCurrentProfile();
      } catch (error) {
        endSessionIfUnauthorized(queryClient, error);
        throw error;
      }
    },
    staleTime: 60_000,
    retry: false,
    refetchOnWindowFocus: false,
  });
}
