import { useMutation, useQueryClient } from "@tanstack/react-query";

import {
  requestVocabularyAudio,
  type VocabularyAudioRequest,
} from "../services/audio-generations-api.js";
import { endSessionIfUnauthorized } from "./session-cache.js";

/**
 * Requests a clip of a vocabulary entry. A mutation, not a query: each request may cost a provider
 * call, so it runs only when the student asks — never on render, never on a background refetch —
 * and nothing is cached client-side (the server already reuses identical clips).
 */
export function useVocabularyAudio() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: VocabularyAudioRequest) => requestVocabularyAudio(request),
    onError: (error) => {
      endSessionIfUnauthorized(queryClient, error);
    },
  });
}
