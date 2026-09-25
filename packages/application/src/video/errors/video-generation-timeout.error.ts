/** The provider did not finish (or even respond) within the adapter's configured timeout. */
export class VideoGenerationTimeoutError extends Error {
  constructor(timeoutMs: number) {
    super(`The video generation provider did not respond within ${timeoutMs}ms.`);
    this.name = "VideoGenerationTimeoutError";
  }
}
