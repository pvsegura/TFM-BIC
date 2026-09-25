import { describe, expect, it } from "vitest";

import { InvalidVideoGenerationTransitionError } from "./errors/invalid-video-generation-transition.error.js";
import { createVideoDefinitionId } from "./video-definition-id.js";
import {
  completeGeneration,
  failGeneration,
  requestVideoGeneration,
  startProcessing,
  VIDEO_GENERATION_STATUSES,
  type NewVideoGenerationJob,
  type VideoGenerationJob,
} from "./video-generation-job.js";

const DEFINITION = createVideoDefinitionId("pl-a1-nasal-vowels-demo");
const T0 = new Date("2026-01-01T10:00:00.000Z");
const T1 = new Date("2026-01-01T10:05:00.000Z");
const T2 = new Date("2026-01-01T10:10:00.000Z");

/** Simulates storage assigning an id on insert — what `VideoGenerationJobRepository.create` does. */
function stored(job: NewVideoGenerationJob, id = "job-1"): VideoGenerationJob {
  return { ...job, id };
}

describe("requestVideoGeneration", () => {
  it("creates a fresh, queued job with no result, no id and no timestamps beyond creation", () => {
    const job = requestVideoGeneration({ userId: "user-1", videoDefinitionId: DEFINITION }, T0);

    expect(job).toEqual({
      userId: "user-1",
      videoDefinitionId: DEFINITION,
      status: "queued",
      providerJobReference: null,
      mediaReference: null,
      errorCategory: null,
      createdAt: T0,
      updatedAt: T0,
      completedAt: null,
    });
    expect(job).not.toHaveProperty("id");
  });
});

describe("startProcessing", () => {
  it("moves a queued job to processing", () => {
    const queued = stored(
      requestVideoGeneration({ userId: "user-1", videoDefinitionId: DEFINITION }, T0),
    );

    const processing = startProcessing(queued, T1);

    expect(processing.status).toBe("processing");
    expect(processing.updatedAt).toBe(T1);
    expect(processing.completedAt).toBeNull();
  });

  it("refuses to start a job that is not queued", () => {
    const queued = stored(
      requestVideoGeneration({ userId: "user-1", videoDefinitionId: DEFINITION }, T0),
    );
    const processing = startProcessing(queued, T1);

    expect(() => startProcessing(processing, T2)).toThrow(InvalidVideoGenerationTransitionError);
  });
});

describe("completeGeneration", () => {
  it("moves a processing job to completed, recording the provider's result", () => {
    const queued = stored(
      requestVideoGeneration({ userId: "user-1", videoDefinitionId: DEFINITION }, T0),
    );
    const processing = startProcessing(queued, T1);

    const completed = completeGeneration(
      processing,
      {
        providerJobReference: "fake:job-1",
        mediaReference: "fake:pl-a1-nasal-vowels-demo/output.mp4",
      },
      T2,
    );

    expect(completed.status).toBe("completed");
    expect(completed.providerJobReference).toBe("fake:job-1");
    expect(completed.mediaReference).toBe("fake:pl-a1-nasal-vowels-demo/output.mp4");
    expect(completed.completedAt).toBe(T2);
  });

  it("refuses to complete a job that is not processing", () => {
    const queued = stored(
      requestVideoGeneration({ userId: "user-1", videoDefinitionId: DEFINITION }, T0),
    );

    expect(() =>
      completeGeneration(queued, { providerJobReference: "x", mediaReference: "y" }, T1),
    ).toThrow(InvalidVideoGenerationTransitionError);
  });
});

describe("failGeneration", () => {
  it("moves a processing job to failed, recording a safe error category", () => {
    const queued = stored(
      requestVideoGeneration({ userId: "user-1", videoDefinitionId: DEFINITION }, T0),
    );
    const processing = startProcessing(queued, T1);

    const failed = failGeneration(processing, "provider_unavailable", T2);

    expect(failed.status).toBe("failed");
    expect(failed.errorCategory).toBe("provider_unavailable");
    expect(failed.completedAt).toBe(T2);
    expect(failed.mediaReference).toBeNull();
  });

  it("also allows a still-queued job to fail (rejected before the provider ever started)", () => {
    const queued = stored(
      requestVideoGeneration({ userId: "user-1", videoDefinitionId: DEFINITION }, T0),
    );

    const failed = failGeneration(queued, "provider_rejected", T1);

    expect(failed.status).toBe("failed");
  });

  it("refuses to fail a job that already reached a final state", () => {
    const queued = stored(
      requestVideoGeneration({ userId: "user-1", videoDefinitionId: DEFINITION }, T0),
    );
    const processing = startProcessing(queued, T1);
    const completed = completeGeneration(
      processing,
      { providerJobReference: "x", mediaReference: "y" },
      T2,
    );

    expect(() => failGeneration(completed, "provider_unavailable", T2)).toThrow(
      InvalidVideoGenerationTransitionError,
    );
  });
});

describe("VIDEO_GENERATION_STATUSES", () => {
  it("is the four lifecycle states, in progression order, with no cancelled state", () => {
    expect(VIDEO_GENERATION_STATUSES).toEqual(["queued", "processing", "completed", "failed"]);
  });
});
