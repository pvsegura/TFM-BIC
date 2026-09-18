import { useMutation } from "@tanstack/react-query";

import { requestPasswordReset } from "../services/auth-api.js";

export function useRequestPasswordReset() {
  return useMutation({ mutationFn: requestPasswordReset });
}
