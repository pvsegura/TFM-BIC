import { VideoDefinitionNotFoundError, type VideoDefinitionId } from "@tfm-bic/domain";
import { makeVideoDefinition } from "@tfm-bic/domain/testing";
import { describe, expect, it, vi } from "vitest";

import { FakeContentRepository } from "../../content/test-support/fakes.js";
import { FixedClock } from "../../identity/test-support/fakes.js";
import { VideoGenerationTimeoutError } from "../errors/video-generation-timeout.error.js";
import { VideoProviderRejectedError } from "../errors/video-provider-rejected.error.js";
import { VideoProviderUnavailableError } from "../errors/video-provider-unavailable.error.js";
import {
  FakeVideoDefinitionRepository,
  FakeVideoGenerationJobRepository,
  makeVideoCatalog,
  StubVideoGenerationService,
} from "../test-support/fakes.js";
import { RequestVideoGenerationUseCase } from "./request-video-generation.use-case.js";

const catalog = makeVideoCatalog();
const DEFINITION = catalog.videoDefinitions[0]!;
const USER = "user-1";
const T0 = new Date("2026-01-01T10:00:00.000Z");

function setup() {
  const content = new FakeContentRepository(catalog);
  const videoDefinitions = new FakeVideoDefinitionRepository(catalog.videoDefinitions);
  const jobs = new FakeVideoGenerationJobRepository();
  const provider = new StubVideoGenerationService();
  const clock = new FixedClock(T0);
  const useCase = new RequestVideoGenerationUseCase(
    content,
    videoDefinitions,
    jobs,
    provider,
    clock,
  );
  return { useCase, jobs, provider, clock };
}

describe("RequestVideoGenerationUseCase", () => {
  it("records a queued-then-processing job and returns immediately, without waiting for the provider", async () => {
    const { useCase, provider } = setup();
    provider.resolveWith({ providerJobReference: "fake:1", mediaReference: "fake:output.mp4" });

    const job = await useCase.execute({ userId: USER, videoDefinitionId: DEFINITION.id });

    expect(job.status).toBe("processing");
    expect(job.userId).toBe(USER);
    expect(job.videoDefinitionId).toBe(DEFINITION.id);
    expect(job.createdAt).toBe(T0);
  });

  it("calls the provider with the definition's script path and title, never a Hyperframes-specific shape", async () => {
    const { useCase, provider } = setup();
    provider.resolveWith({ providerJobReference: "fake:1", mediaReference: "fake:output.mp4" });

    await useCase.execute({ userId: USER, videoDefinitionId: DEFINITION.id });

    expect(provider.calls).toEqual([
      {
        videoDefinitionId: DEFINITION.id,
        scriptPath: DEFINITION.scriptPath,
        title: DEFINITION.title,
      },
    ]);
  });

  it("moves the job to completed once the provider resolves, recording its result", async () => {
    const { useCase, provider, jobs } = setup();
    provider.resolveWith({ providerJobReference: "fake:1", mediaReference: "fake:output.mp4" });

    const job = await useCase.execute({ userId: USER, videoDefinitionId: DEFINITION.id });

    await vi.waitFor(() => {
      const stored = jobs.jobs.find((j) => j.id === job.id);
      expect(stored?.status).toBe("completed");
    });
    const stored = jobs.jobs.find((j) => j.id === job.id);
    expect(stored?.mediaReference).toBe("fake:output.mp4");
    expect(stored?.providerJobReference).toBe("fake:1");
  });

  it("moves the job to failed with a safe category when the provider rejects, never the raw provider error", async () => {
    const { useCase, provider, jobs } = setup();
    provider.rejectWith(new VideoProviderRejectedError("the render project could not be parsed"));

    const job = await useCase.execute({ userId: USER, videoDefinitionId: DEFINITION.id });

    await vi.waitFor(() => {
      const stored = jobs.jobs.find((j) => j.id === job.id);
      expect(stored?.status).toBe("failed");
    });
    const stored = jobs.jobs.find((j) => j.id === job.id);
    expect(stored?.errorCategory).toBe("provider_rejected");
    expect(stored?.mediaReference).toBeNull();
  });

  it("categorizes a provider timeout as failed/timeout", async () => {
    const { useCase, provider, jobs } = setup();
    provider.rejectWith(new VideoGenerationTimeoutError(5000));

    const job = await useCase.execute({ userId: USER, videoDefinitionId: DEFINITION.id });

    await vi.waitFor(() => {
      const stored = jobs.jobs.find((j) => j.id === job.id);
      expect(stored?.status).toBe("failed");
    });
    const stored = jobs.jobs.find((j) => j.id === job.id);
    expect(stored?.errorCategory).toBe("timeout");
  });

  it("categorizes a provider being unreachable as failed/provider_unavailable", async () => {
    const { useCase, provider, jobs } = setup();
    provider.rejectWith(new VideoProviderUnavailableError("connection refused"));

    const job = await useCase.execute({ userId: USER, videoDefinitionId: DEFINITION.id });

    await vi.waitFor(() => {
      const stored = jobs.jobs.find((j) => j.id === job.id);
      expect(stored?.status).toBe("failed");
    });
    const stored = jobs.jobs.find((j) => j.id === job.id);
    expect(stored?.errorCategory).toBe("provider_unavailable");
  });

  it("categorizes any other thrown error as failed/unknown, never leaking its message", async () => {
    const { useCase, provider, jobs } = setup();
    provider.rejectWith(new Error("a very specific internal stack trace detail"));

    const job = await useCase.execute({ userId: USER, videoDefinitionId: DEFINITION.id });

    await vi.waitFor(() => {
      const stored = jobs.jobs.find((j) => j.id === job.id);
      expect(stored?.status).toBe("failed");
    });
    const stored = jobs.jobs.find((j) => j.id === job.id);
    expect(stored?.errorCategory).toBe("unknown");
  });

  it("refuses to request a video that is not visible, and creates no job", async () => {
    const { useCase, jobs } = setup();

    await expect(
      useCase.execute({
        userId: USER,
        videoDefinitionId: "pl-does-not-exist" as VideoDefinitionId,
      }),
    ).rejects.toThrow(VideoDefinitionNotFoundError);
    expect(jobs.jobs).toHaveLength(0);
  });

  it("refuses to request a draft video", async () => {
    const { jobs } = setup();
    const draftDefinitions = new FakeVideoDefinitionRepository([
      makeVideoDefinition({ status: "draft" }),
    ]);
    const content = new FakeContentRepository(catalog);
    const draftUseCase = new RequestVideoGenerationUseCase(
      content,
      draftDefinitions,
      jobs,
      new StubVideoGenerationService(),
      new FixedClock(T0),
    );

    await expect(
      draftUseCase.execute({ userId: USER, videoDefinitionId: DEFINITION.id }),
    ).rejects.toThrow(VideoDefinitionNotFoundError);
    expect(jobs.jobs).toHaveLength(0);
  });
});
