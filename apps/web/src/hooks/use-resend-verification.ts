import { useMutation } from "@tanstack/react-query";

import { resendVerification } from "../services/auth-api.js";

export function useResendVerification() {
  return useMutation({ mutationFn: resendVerification });
}
