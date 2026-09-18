import { useMutation } from "@tanstack/react-query";

import { confirmPasswordReset } from "../services/auth-api.js";

export function useConfirmPasswordReset() {
  return useMutation({ mutationFn: confirmPasswordReset });
}
