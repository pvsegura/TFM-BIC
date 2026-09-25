import { VideoGenerationJobNotFoundError, type VideoGenerationJob } from "@tfm-bic/domain";

import type { VideoGenerationJobRepository } from "../ports/video-generation-job-repository.js";

export interface GetVideoGenerationStatusInput {
  /** Must come from the authenticated session — never from client input. */
  userId: string;
  jobId: string;
}

/**
 * A student polls their own generation job's status. A job that does not exist and a job that
 * belongs to someone else are the same `VideoGenerationJobNotFoundError` (mapped to the same
 * `404`), so a caller cannot tell the two apart — the same IDOR-safe pattern every other
 * user-owned resource in this codebase uses (see docs/security/security-baseline.md).
 */
export class GetVideoGenerationStatusUseCase {
  constructor(private readonly jobs: VideoGenerationJobRepository) {}

  async execute(input: GetVideoGenerationStatusInput): Promise<VideoGenerationJob> {
    const job = await this.jobs.findById(input.jobId);
    if (job?.userId !== input.userId) {
      throw new VideoGenerationJobNotFoundError(input.jobId);
    }
    return job;
  }
}
