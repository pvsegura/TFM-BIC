import {
  GetVideoGenerationStatusUseCase,
  RequestVideoGenerationUseCase,
} from "@tfm-bic/application";

import type { ContentDependencies } from "./content-dependencies.js";
import type { VideoDependencies } from "./video-dependencies.js";

export interface VideoUseCases {
  requestVideoGeneration: RequestVideoGenerationUseCase;
  getVideoGenerationStatus: GetVideoGenerationStatusUseCase;
}

/**
 * Composition-root wiring only. `RequestVideoGenerationUseCase` is built on the content
 * dependencies' `contentRepository` (for the M5 language/level visibility rule) and
 * `videoDefinitionRepository`, plus the job store, the provider and the clock;
 * `GetVideoGenerationStatusUseCase` only needs the job store.
 */
export function createVideoUseCases(
  content: ContentDependencies,
  deps: VideoDependencies,
): VideoUseCases {
  const { contentRepository, videoDefinitionRepository } = content;
  const { videoGenerationJobRepository, provider, clock } = deps;

  return {
    requestVideoGeneration: new RequestVideoGenerationUseCase(
      contentRepository,
      videoDefinitionRepository,
      videoGenerationJobRepository,
      provider,
      clock,
    ),
    getVideoGenerationStatus: new GetVideoGenerationStatusUseCase(videoGenerationJobRepository),
  };
}
