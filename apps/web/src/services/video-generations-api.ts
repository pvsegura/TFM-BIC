import {
  videoGenerationJobResponseSchema,
  type VideoGenerationJobResponse,
} from "@tfm-bic/contracts";

import { requestJson } from "./api-request.js";

/**
 * Video generation is per-student (M11), so — like phonetics/vocabulary — every request carries
 * the session cookie and the user is identified by that cookie alone. Same-origin like the rest
 * (see vite.config.ts). Every response is validated against the shared contract (an allowlist).
 */
const enc = encodeURIComponent;

export async function requestVideoGeneration(
  videoDefinitionId: string,
): Promise<VideoGenerationJobResponse> {
  return videoGenerationJobResponseSchema.parse(
    await requestJson("/video-generations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ videoDefinitionId }),
    }),
  );
}

export async function fetchVideoGenerationStatus(
  jobId: string,
): Promise<VideoGenerationJobResponse> {
  return videoGenerationJobResponseSchema.parse(
    await requestJson(`/video-generations/${enc(jobId)}`),
  );
}
