import { useMutation, useQueryClient } from "@tanstack/react-query";

import { login } from "../services/auth-api.js";
import { clearUserScopedCache } from "./session-cache.js";
import { CURRENT_USER_QUERY_KEY } from "./use-current-user.js";

export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: login,
    onSuccess: (user) => {
      // Belt and braces with logout: a session that ended without an explicit
      // logout (expiry, another tab) must not leak into whoever signs in next.
      clearUserScopedCache(queryClient);
      queryClient.setQueryData(CURRENT_USER_QUERY_KEY, user);
    },
  });
}
