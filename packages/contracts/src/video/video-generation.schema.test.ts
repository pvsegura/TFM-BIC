import { describe, expect, it } from "vitest";

import {
  requestVideoGenerationRequestSchema,
  videoGenerationJobIdParamSchema,
  videoGenerationJobResponseSchema,
} from "./video-generation.schema.js";

describe("requestVideoGenerationRequestSchema", () => {
  it("accepts a body naming only the definition to render", () => {
    const parsed = requestVideoGenerationRequestSchema.parse({
      videoDefinitionId: "pl-a1-nasal-vowels-demo",
    });

    expect(parsed.videoDefinitionId).toBe("pl-a1-nasal-vowels-demo");
  });

  it("rejects a body naming a status, a userId or any other undocumented key", () => {
    expect(() =>
      requestVideoGenerationRequestSchema.parse({
        videoDefinitionId: "pl-a1-nasal-vowels-demo",
        status: "completed",
      }),
    ).toThrow();
    expect(() =>
      requestVideoGenerationRequestSchema.parse({
        videoDefinitionId: "pl-a1-nasal-vowels-demo",
        userId: "someone-else",
      }),
    ).toThrow();
  });

  it("rejects a malformed videoDefinitionId", () => {
    expect(() =>
      requestVideoGenerationRequestSchema.parse({ videoDefinitionId: "../etc/passwd" }),
    ).toThrow();
  });
});

describe("videoGenerationJobIdParamSchema", () => {
  it("accepts a UUID", () => {
    const parsed = videoGenerationJobIdParamSchema.parse({
      jobId: "11111111-1111-4111-8111-111111111111",
    });
    expect(parsed.jobId).toBe("11111111-1111-4111-8111-111111111111");
  });

  it("rejects a non-UUID id", () => {
    expect(() =>
      videoGenerationJobIdParamSchema.parse({ jobId: "pl-a1-nasal-vowels-demo" }),
    ).toThrow();
  });
});

describe("videoGenerationJobResponseSchema", () => {
  it("accepts a queued job with no result yet", () => {
    const parsed = videoGenerationJobResponseSchema.parse({
      id: "11111111-1111-4111-8111-111111111111",
      videoDefinitionId: "pl-a1-nasal-vowels-demo",
      status: "queued",
      mediaReference: null,
      errorCategory: null,
      createdAt: "2026-01-01T10:00:00.000Z",
      updatedAt: "2026-01-01T10:00:00.000Z",
      completedAt: null,
    });

    expect(parsed.status).toBe("queued");
    expect(parsed.mediaReference).toBeNull();
  });

  it("accepts a completed job with a media reference", () => {
    const parsed = videoGenerationJobResponseSchema.parse({
      id: "11111111-1111-4111-8111-111111111111",
      videoDefinitionId: "pl-a1-nasal-vowels-demo",
      status: "completed",
      mediaReference: "fake:pl-a1-nasal-vowels-demo/output.mp4",
      errorCategory: null,
      createdAt: "2026-01-01T10:00:00.000Z",
      updatedAt: "2026-01-01T10:01:00.000Z",
      completedAt: "2026-01-01T10:01:00.000Z",
    });

    expect(parsed.mediaReference).toBe("fake:pl-a1-nasal-vowels-demo/output.mp4");
  });

  it("strips any extra key a use-case result might carry (an allowlist, not a passthrough)", () => {
    const parsed = videoGenerationJobResponseSchema.parse({
      id: "11111111-1111-4111-8111-111111111111",
      videoDefinitionId: "pl-a1-nasal-vowels-demo",
      status: "queued",
      mediaReference: null,
      errorCategory: null,
      createdAt: "2026-01-01T10:00:00.000Z",
      updatedAt: "2026-01-01T10:00:00.000Z",
      completedAt: null,
      userId: "user-1",
      providerJobReference: "internal-only",
    });

    expect(parsed).not.toHaveProperty("userId");
    expect(parsed).not.toHaveProperty("providerJobReference");
  });
});
