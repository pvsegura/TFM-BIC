import {
  completeGeneration,
  failGeneration,
  requestVideoGeneration,
  startProcessing,
  type VideoDefinition,
  type VideoDefinitionId,
  type VideoGenerationJob,
} from "@tfm-bic/domain";

import type { ContentRepository } from "../../content/ports/content-repository.js";
import type { Clock } from "../../ports/clock.js";
import { VideoGenerationTimeoutError } from "../errors/video-generation-timeout.error.js";
import { VideoProviderRejectedError } from "../errors/video-provider-rejected.error.js";
import { VideoProviderUnavailableError } from "../errors/video-provider-unavailable.error.js";
import { findVisibleVideoDefinition } from "../find-visible-video-definition.js";
import type { VideoDefinitionRepository } from "../ports/video-definition-repository.js";
import type { VideoGenerationJobRepository } from "../ports/video-generation-job-repository.js";
import type { VideoGenerationService } from "../ports/video-generation-service.js";

export interface RequestVideoGenerationInput {
  /** Must come from the authenticated session — never from client input. */
  userId: string;
  videoDefinitionId: VideoDefinitionId;
}

/** Safe, generic categories a client (and the logs) can see — never the provider's raw error text. */
function categorizeProviderError(error: unknown): string {
  if (error instanceof VideoProviderRejectedError) {
    return "provider_rejected";
  }
  if (error instanceof VideoGenerationTimeoutError) {
    return "timeout";
  }
  if (error instanceof VideoProviderUnavailableError) {
    return "provider_unavailable";
  }
  return "unknown";
}

/**
 * A student requests a video be generated. The definition must be one they can see. Rendering is
 * not instant, so this never waits for the provider to finish: it records the job as `queued`,
 * moves it to `processing`, starts the provider call, and returns immediately — the caller (the
 * route) responds `201` right away, and the client polls `GetVideoGenerationStatusUseCase` for the
 * result. This is an in-process, non-durable task (see ADR-012): it does not survive a process
 * restart, is not retried, and assumes a single server instance — an explicit MVP limitation, not
 * an oversight; a later milestone can introduce durable background work if it proves necessary.
 */
export class RequestVideoGenerationUseCase {
  constructor(
    private readonly contentRepository: ContentRepository,
    private readonly videoDefinitions: VideoDefinitionRepository,
    private readonly jobs: VideoGenerationJobRepository,
    private readonly provider: VideoGenerationService,
    private readonly clock: Clock,
  ) {}

  async execute(input: RequestVideoGenerationInput): Promise<VideoGenerationJob> {
    const definition = await findVisibleVideoDefinition(
      this.contentRepository,
      this.videoDefinitions,
      input.videoDefinitionId,
    );

    const created = await this.jobs.create(
      requestVideoGeneration(
        { userId: input.userId, videoDefinitionId: definition.id },
        this.clock.now(),
      ),
    );
    const processing = startProcessing(created, this.clock.now());
    await this.jobs.update(processing);

    // Deliberately not awaited — see this class's doc comment.
    void this.generateInBackground(processing, definition);

    return processing;
  }

  private async generateInBackground(
    job: VideoGenerationJob,
    definition: VideoDefinition,
  ): Promise<void> {
    try {
      const result = await this.provider.generate({
        videoDefinitionId: definition.id,
        scriptPath: definition.scriptPath,
        title: definition.title,
      });
      await this.jobs.update(completeGeneration(job, result, this.clock.now()));
    } catch (error) {
      await this.jobs.update(failGeneration(job, categorizeProviderError(error), this.clock.now()));
    }
  }
}
