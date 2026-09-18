import { useMutation, useQueryClient } from "@tanstack/react-query";

import { logout } from "../services/auth-api.js";
import { CURRENT_USER_QUERY_KEY } from "./use-current-user.js";

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: logout,
    onSuccess: () => {
      queryClient.setQueryData(CURRENT_USER_QUERY_KEY, null);
    },
  });
}
