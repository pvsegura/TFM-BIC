import { InvalidVideoGenerationTransitionError } from "./errors/invalid-video-generation-transition.error.js";
import type { VideoDefinitionId } from "./video-definition-id.js";

/**
 * A generation job's lifecycle. Self-hosted rendering is not instant, so a request is recorded as
 * `queued`, moves to `processing` once the provider call actually starts, and ends at `completed`
 * or `failed` — never both, never neither. There is no `cancelled` state: nothing in this
 * milestone supports cancelling a render in flight (see the `hyperframes` skill).
 */
export const VIDEO_GENERATION_STATUSES = ["queued", "processing", "completed", "failed"] as const;
export type VideoGenerationStatus = (typeof VIDEO_GENERATION_STATUSES)[number];

/**
 * One student's request to generate one video. It belongs to the student who requested it;
 * `videoDefinitionId` points at the content describing what to generate, never duplicating it.
 * `providerJobReference` and `mediaReference` are opaque strings from whichever
 * `VideoGenerationService` handled the request — this type never holds a provider SDK type.
 *
 * Invariants: `completedAt` is set if and only if `status` is `completed` or `failed`;
 * `mediaReference`/`providerJobReference` are set only once `status` is `completed`;
 * `errorCategory` is set only once `status` is `failed`.
 */
export interface VideoGenerationJob {
  /** Assigned by storage. */
  id: string;
  userId: string;
  videoDefinitionId: VideoDefinitionId;
  status: VideoGenerationStatus;
  providerJobReference: string | null;
  mediaReference: string | null;
  errorCategory: string | null;
  createdAt: Date;
  updatedAt: Date;
  completedAt: Date | null;
}

/** A job about to be stored: everything except the id storage assigns. */
export type NewVideoGenerationJob = Omit<VideoGenerationJob, "id">;

/** A fresh, queued job — the only way one is ever created. */
export function requestVideoGeneration(
  input: { userId: string; videoDefinitionId: VideoDefinitionId },
  now: Date,
): NewVideoGenerationJob {
  return {
    userId: input.userId,
    videoDefinitionId: input.videoDefinitionId,
    status: "queued",
    providerJobReference: null,
    mediaReference: null,
    errorCategory: null,
    createdAt: now,
    updatedAt: now,
    completedAt: null,
  };
}

/** Only a queued job can start processing. */
export function startProcessing(job: VideoGenerationJob, now: Date): VideoGenerationJob {
  if (job.status !== "queued") {
    throw new InvalidVideoGenerationTransitionError(job.status, "processing");
  }
  return { ...job, status: "processing", updatedAt: now };
}

/** Only a processing job can complete. */
export function completeGeneration(
  job: VideoGenerationJob,
  result: { providerJobReference: string; mediaReference: string },
  now: Date,
): VideoGenerationJob {
  if (job.status !== "processing") {
    throw new InvalidVideoGenerationTransitionError(job.status, "completed");
  }
  return {
    ...job,
    status: "completed",
    providerJobReference: result.providerJobReference,
    mediaReference: result.mediaReference,
    updatedAt: now,
    completedAt: now,
  };
}

/** A queued or processing job can fail (a provider can be rejected before it ever starts). */
export function failGeneration(
  job: VideoGenerationJob,
  errorCategory: string,
  now: Date,
): VideoGenerationJob {
  if (job.status !== "queued" && job.status !== "processing") {
    throw new InvalidVideoGenerationTransitionError(job.status, "failed");
  }
  return { ...job, status: "failed", errorCategory, updatedAt: now, completedAt: now };
}
