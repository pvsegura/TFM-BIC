import {
  VideoGenerationTimeoutError,
  VideoProviderRejectedError,
  VideoProviderUnavailableError,
  type VideoGenerationRequest,
  type VideoGenerationResult,
  type VideoGenerationService,
} from "@tfm-bic/application";

export const FAKE_VIDEO_GENERATION_SCENARIOS = [
  "success",
  "provider-rejected",
  "provider-unavailable",
  "timeout",
] as const;
export type FakeVideoGenerationScenario = (typeof FAKE_VIDEO_GENERATION_SCENARIOS)[number];

/**
 * The only `VideoGenerationService` adapter wired by default — see ADR-011/012. Dev, test and CI
 * never depend on Hyperframes availability, a real render, network access or any credential.
 * Never reads the render project a definition's `scriptPath` names; it only echoes the definition
 * id back in an opaque reference string.
 *
 * Deterministic: a definition's outcome is decided by its id, given once at construction — never
 * by chance — so a test asking for a definition mapped to `"provider-rejected"` gets the same
 * rejection every time. A definition with no mapping always succeeds, which is what lets the real
 * demo video (and any future one) generate successfully with zero configuration.
 */
export class FakeVideoGenerationService implements VideoGenerationService {
  private readonly scenarios: ReadonlyMap<string, FakeVideoGenerationScenario>;
  readonly calls: VideoGenerationRequest[] = [];

  constructor(scenarios: ReadonlyMap<string, FakeVideoGenerationScenario> = new Map()) {
    this.scenarios = scenarios;
  }

  generate(request: VideoGenerationRequest): Promise<VideoGenerationResult> {
    this.calls.push(request);
    const scenario = this.scenarios.get(request.videoDefinitionId) ?? "success";

    switch (scenario) {
      case "success":
        return Promise.resolve({
          providerJobReference: `fake:${request.videoDefinitionId}`,
          mediaReference: `fake:${request.videoDefinitionId}/output.mp4`,
        });
      case "provider-rejected":
        return Promise.reject(
          new VideoProviderRejectedError(`fake scenario for "${request.videoDefinitionId}"`),
        );
      case "provider-unavailable":
        return Promise.reject(
          new VideoProviderUnavailableError(`fake scenario for "${request.videoDefinitionId}"`),
        );
      case "timeout":
        return Promise.reject(new VideoGenerationTimeoutError(0));
    }
  }
}
