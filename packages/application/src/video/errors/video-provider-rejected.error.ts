/** The provider ran and refused the request (a malformed render project, an invalid script, ...). */
export class VideoProviderRejectedError extends Error {
  constructor(reason: string) {
    super(`The video generation provider rejected the request: ${reason}`);
    this.name = "VideoProviderRejectedError";
  }
}
