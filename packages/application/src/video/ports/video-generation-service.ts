/**
 * What a use case asks a video-generation provider to do — described in business terms, never a
 * provider SDK/response type. `scriptPath` points at the render project under
 * `content/video-scripts/`; only the adapter reads what is inside it.
 */
export interface VideoGenerationRequest {
  videoDefinitionId: string;
  scriptPath: string;
  title: string;
}

/** An opaque result: where the render can be found, and the provider's own reference for it. Both are plain strings — never a provider SDK type. */
export interface VideoGenerationResult {
  providerJobReference: string;
  mediaReference: string;
}

/**
 * The provider boundary (ADR-011/012): the only thing between a use case and an actual video
 * renderer. Implemented in `packages/data` by `FakeVideoGenerationService` (the default
 * everywhere — dev, test and CI) and `HyperframesCliProvider` (real, selected only via
 * `VIDEO_GENERATION_PROVIDER=hyperframes`). A future provider is a new adapter behind this same
 * interface — no use case, domain type or route changes.
 *
 * `generate` is a single request/result call, not a multi-step polling protocol: self-hosted
 * rendering has no verified webhook/job-status API of its own (see the `hyperframes` skill), so
 * the job lifecycle (`queued -> processing -> completed|failed`) is modeled around this one call
 * at the application layer, not inside the provider. A slow render is expected — callers must not
 * await this from an HTTP request handler (see `RequestVideoGenerationUseCase`).
 *
 * Rejects with `VideoProviderUnavailableError`, `VideoProviderRejectedError` or
 * `VideoGenerationTimeoutError` — never a raw provider error — so a use case never needs to know
 * which provider is behind the interface.
 */
export interface VideoGenerationService {
  generate(request: VideoGenerationRequest): Promise<VideoGenerationResult>;
}
