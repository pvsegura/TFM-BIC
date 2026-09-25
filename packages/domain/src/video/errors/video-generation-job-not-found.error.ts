/** No generation job has this id for the requesting user. Does not reveal whether a job with this id exists for someone else. */
export class VideoGenerationJobNotFoundError extends Error {
  constructor(jobId: string) {
    super(`Video generation job "${jobId}" was not found.`);
    this.name = "VideoGenerationJobNotFoundError";
  }
}
