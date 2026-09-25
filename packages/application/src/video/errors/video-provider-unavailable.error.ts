/** The provider could not be reached at all (process failed to start, network unreachable, ...). Never carries the raw provider error message — see docs/security/security-baseline.md. */
export class VideoProviderUnavailableError extends Error {
  constructor(reason: string) {
    super(`The video generation provider is unavailable: ${reason}`);
    this.name = "VideoProviderUnavailableError";
  }
}
