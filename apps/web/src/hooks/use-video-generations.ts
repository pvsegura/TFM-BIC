import { skipToken, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  fetchVideoGenerationStatus,
  requestVideoGeneration,
} from "../services/video-generations-api.js";
import { endingSessionOnUnauthorized, endSessionIfUnauthorized } from "./session-cache.js";

/** Query-key root for video generation. User-scoped like phonetics/vocabulary — cleared on
 * logout/login by `clearUserScopedCache` (it is not in the session-independent roots). */
export const VIDEO_GENERATIONS_QUERY_KEY_ROOT = "video-generations";

const statusKey = (jobId: string) => [VIDEO_GENERATIONS_QUERY_KEY_ROOT, "status", jobId] as const;

/** While the job is still running the client polls; once it reaches a final state, polling stops
 * on its own (`refetchInterval` returning `false`) rather than being cancelled by a timer. */
const POLL_INTERVAL_MS = 2000;

/**
 * Starts a video generation. The server's answer is the truth: on success the returned job (with
 * its server-assigned id and `processing` status) is seeded directly into the status query's
 * cache, so the very next render of `useVideoGenerationStatus(job.id)` already has data — no
 * request wasted re-fetching what the `POST` already returned.
 */
export function useRequestVideoGeneration() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (videoDefinitionId: string) => requestVideoGeneration(videoDefinitionId),
    onSuccess: (job) => {
      queryClient.setQueryData(statusKey(job.id), job);
    },
    onError: (error) => {
      endSessionIfUnauthorized(queryClient, error);
    },
  });
}

/**
 * Polls a generation job's status while it is `queued`/`processing`, and stops on its own once it
 * reaches `completed` or `failed` — no separate cleanup needed, since `refetchInterval` simply
 * stops being scheduled. Idle without a job id.
 */
export function useVideoGenerationStatus(jobId: string | undefined) {
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: statusKey(jobId ?? ""),
    queryFn:
      jobId === undefined
        ? skipToken
        : () => endingSessionOnUnauthorized(queryClient, () => fetchVideoGenerationStatus(jobId)),
    retry: false,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "queued" || status === "processing" ? POLL_INTERVAL_MS : false;
    },
  });
}
