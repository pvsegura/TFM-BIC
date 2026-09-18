import { useMutation } from "@tanstack/react-query";

import { verifyEmail } from "../services/auth-api.js";

export function useVerifyEmail() {
  return useMutation({ mutationFn: verifyEmail });
}
