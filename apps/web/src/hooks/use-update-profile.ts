import { useMutation, useQueryClient } from "@tanstack/react-query";

import { updateProfile } from "../services/profile-api.js";
import { PROFILE_QUERY_KEY } from "./use-current-profile.js";
import { endSessionIfUnauthorized } from "./session-cache.js";

/**
 * On success the cache is set to the profile the server *persisted* (the
 * PATCH response), so the UI shows server state rather than trusting what it
 * submitted — no extra GET round trip needed.
 */
export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateProfile,
    onSuccess: (persisted) => {
      queryClient.setQueryData(PROFILE_QUERY_KEY, persisted);
    },
    onError: (error) => {
      endSessionIfUnauthorized(queryClient, error);
    },
  });
}
