import { useMutation, useQueryClient } from "@tanstack/react-query";

import { login } from "../services/auth-api.js";
import { CURRENT_USER_QUERY_KEY } from "./use-current-user.js";

export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: login,
    onSuccess: (user) => {
      queryClient.setQueryData(CURRENT_USER_QUERY_KEY, user);
    },
  });
}
