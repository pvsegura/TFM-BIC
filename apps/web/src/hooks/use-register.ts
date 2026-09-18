import { useMutation } from "@tanstack/react-query";

import { register } from "../services/auth-api.js";

export function useRegister() {
  return useMutation({ mutationFn: register });
}
