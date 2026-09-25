import { VideoGenerationJobNotFoundError } from "@tfm-bic/domain";
import { makeVideoGenerationJob } from "@tfm-bic/domain/testing";
import { describe, expect, it } from "vitest";

import { FakeVideoGenerationJobRepository } from "../test-support/fakes.js";
import { GetVideoGenerationStatusUseCase } from "./get-video-generation-status.use-case.js";

const OWNER = "user-1";
const OTHER = "user-2";

function setup() {
  const jobs = new FakeVideoGenerationJobRepository();
  const useCase = new GetVideoGenerationStatusUseCase(jobs);
  return { useCase, jobs };
}

describe("GetVideoGenerationStatusUseCase", () => {
  it("returns the caller's own job", async () => {
    const { useCase, jobs } = setup();
    jobs.jobs.push(makeVideoGenerationJob({ id: "job-1", userId: OWNER, status: "processing" }));

    const job = await useCase.execute({ userId: OWNER, jobId: "job-1" });

    expect(job.status).toBe("processing");
  });

  it("throws not-found for a job that does not exist", async () => {
    const { useCase } = setup();

    await expect(useCase.execute({ userId: OWNER, jobId: "does-not-exist" })).rejects.toThrow(
      VideoGenerationJobNotFoundError,
    );
  });

  it("throws the same not-found for a job that belongs to another user — never a 403, never revealing it exists", async () => {
    const { useCase, jobs } = setup();
    jobs.jobs.push(makeVideoGenerationJob({ id: "job-1", userId: OTHER }));

    await expect(useCase.execute({ userId: OWNER, jobId: "job-1" })).rejects.toThrow(
      VideoGenerationJobNotFoundError,
    );
  });
});
