import type { CoachContextRef, CoachPracticeResponse } from "@tfm-bic/contracts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";

import { ApiError } from "../services/api-error.js";
import {
  fetchCoachStatus,
  sendCoachMessage,
  type CoachMode,
  type CoachTurn,
} from "../services/coach-api.js";
import { endingSessionOnUnauthorized, endSessionIfUnauthorized } from "./session-cache.js";

/**
 * Query-key root for the AI Coach. The status is per deployment, but the route is authenticated,
 * so it lives under a user-scoped root like lessons and vocabulary — `clearUserScopedCache` drops
 * it on logout and login.
 */
export const COACH_QUERY_KEY_ROOT = "coach";

const statusKey = (languageCode: string | undefined) =>
  [COACH_QUERY_KEY_ROOT, "status", languageCode ?? null] as const;

/**
 * Whether the coach is enabled here and, with a language, the course context it will be given —
 * so the page can show the learner the level the application derived rather than letting them
 * assume one.
 */
export function useCoachStatus(languageCode?: string) {
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: statusKey(languageCode),
    queryFn: () => endingSessionOnUnauthorized(queryClient, () => fetchCoachStatus(languageCode)),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
}

/** One message in the on-screen conversation. `practice` belongs to the coach turn that made it. */
export interface CoachMessage {
  id: number;
  role: "learner" | "coach";
  text: string;
  toolsUsed?: readonly string[];
  practice?: CoachPracticeResponse | undefined;
}

export interface UseCoachConversation {
  messages: readonly CoachMessage[];
  send: (message: string, mode: CoachMode) => void;
  /** True while a turn is in flight: the composer disables itself and the UI announces it. */
  isSending: boolean;
  error: string | undefined;
  /** Re-sends the last learner message, for the retry button on a failure. */
  retry: () => void;
  canRetry: boolean;
  reset: () => void;
}

/** What the learner sees when the API fails. The API's own message when it gave one, so a 429 or a
 * 503 explains itself; a generic line otherwise. Never a status code or a provider detail. */
function messageFor(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 429) {
      return "You've reached the AI Coach limit for now. Please try again later — your lessons and exercises are unaffected.";
    }
    return error.message;
  }
  return "Something went wrong talking to the AI Coach. Please try again.";
}

/**
 * The conversation, held in component state (M23, ADR-034, decision 5).
 *
 * There is deliberately no persistence — not `localStorage`, not a query cache entry, not a table.
 * The transcript is sent back with each turn so the coach has context, and it is gone when the tab
 * closes. The UI tells the learner that, rather than pretending to have a history it does not keep.
 *
 * A mutation, not a query: each turn costs a provider call, so it runs only when the learner asks —
 * never on render, never on a background refetch, and never twice for one click (`isPending` gates
 * the composer, since a disabled button alone is not enough).
 */
export function useCoachConversation(options: {
  languageCode: string;
  context?: CoachContextRef | undefined;
}): UseCoachConversation {
  const queryClient = useQueryClient();
  const [messages, setMessages] = useState<readonly CoachMessage[]>([]);
  const [lastAsk, setLastAsk] = useState<{ message: string; mode: CoachMode } | undefined>();
  const [error, setError] = useState<string | undefined>();

  const mutation = useMutation({
    mutationFn: (ask: { message: string; mode: CoachMode; history: readonly CoachTurn[] }) =>
      sendCoachMessage({
        message: ask.message,
        mode: ask.mode,
        languageCode: options.languageCode,
        history: ask.history,
        context: options.context,
      }),
    onSuccess: (response) => {
      setError(undefined);
      setLastAsk(undefined);
      setMessages((current) => [
        ...current,
        {
          id: current.length,
          role: "coach",
          text: response.answer,
          toolsUsed: response.toolsUsed,
          practice: response.practice ?? undefined,
        },
      ]);
    },
    onError: (failure) => {
      endSessionIfUnauthorized(queryClient, failure);
      setError(messageFor(failure));
    },
  });

  const ask = useCallback(
    (message: string, mode: CoachMode, history: readonly CoachMessage[]) => {
      setError(undefined);
      setLastAsk({ message, mode });
      mutation.mutate({
        message,
        mode,
        history: history.map((entry) => ({ role: entry.role, text: entry.text })),
      });
    },
    [mutation],
  );

  const send = useCallback(
    (message: string, mode: CoachMode) => {
      const trimmed = message.trim();
      if (trimmed === "" || mutation.isPending) return;
      // The learner's turn appears immediately; the history sent is what came *before* it.
      const history = messages;
      setMessages((current) => [
        ...current,
        { id: current.length, role: "learner", text: trimmed },
      ]);
      ask(trimmed, mode, history);
    },
    [ask, messages, mutation.isPending],
  );

  const retry = useCallback(() => {
    if (!lastAsk || mutation.isPending) return;
    // The learner's message is already on screen; replay the turn without duplicating it.
    ask(lastAsk.message, lastAsk.mode, messages.slice(0, -1));
  }, [ask, lastAsk, messages, mutation.isPending]);

  const reset = useCallback(() => {
    setMessages([]);
    setLastAsk(undefined);
    setError(undefined);
  }, []);

  return {
    messages,
    send,
    isSending: mutation.isPending,
    error,
    retry,
    canRetry: lastAsk !== undefined && !mutation.isPending,
    reset,
  };
}
