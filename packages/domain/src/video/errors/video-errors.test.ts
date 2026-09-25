import { describe, expect, it } from "vitest";

import { InvalidVideoGenerationTransitionError } from "./invalid-video-generation-transition.error.js";
import { VideoDefinitionNotFoundError } from "./video-definition-not-found.error.js";
import { VideoGenerationJobNotFoundError } from "./video-generation-job-not-found.error.js";

describe("video not-found errors", () => {
  it("names the definition that was asked for, for logs — the API never sends this message to a client", () => {
    const error = new VideoDefinitionNotFoundError("pl-a1-nasal-vowels-demo");

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe("VideoDefinitionNotFoundError");
    expect(error.message).toBe('Video definition "pl-a1-nasal-vowels-demo" was not found.');
  });

  it("names the job that was asked for", () => {
    const error = new VideoGenerationJobNotFoundError("job-1");

    expect(error.name).toBe("VideoGenerationJobNotFoundError");
    expect(error.message).toBe('Video generation job "job-1" was not found.');
  });
});

describe("InvalidVideoGenerationTransitionError", () => {
  it("names the attempted move", () => {
    const error = new InvalidVideoGenerationTransitionError("completed", "processing");

    expect(error.name).toBe("InvalidVideoGenerationTransitionError");
    expect(error.message).toBe(
      'Cannot move a video generation job from "completed" to "processing".',
    );
  });
});
