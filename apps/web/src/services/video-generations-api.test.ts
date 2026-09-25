import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "./api-error.js";
import { fetchVideoGenerationStatus, requestVideoGeneration } from "./video-generations-api.js";

const JOB = {
  id: "11111111-1111-4111-8111-111111111111",
  videoDefinitionId: "pl-a1-nasal-vowels-demo",
  status: "processing",
  mediaReference: null,
  errorCategory: null,
  createdAt: "2026-01-01T10:00:00.000Z",
  updatedAt: "2026-01-01T10:00:00.000Z",
  completedAt: null,
};

function stub(status: number, body: unknown) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: status >= 200 && status < 300,
      status,
      json: () => Promise.resolve(body),
    }),
  );
}

function lastCall() {
  const [url, init] = vi.mocked(fetch).mock.calls[0] ?? [];
  return { url: url as string, init: init ?? {} };
}

beforeEach(() => {
  stub(201, JOB);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("requestVideoGeneration", () => {
  it("posts the definition id as JSON and returns the parsed job", async () => {
    const result = await requestVideoGeneration("pl-a1-nasal-vowels-demo");

    expect(result.status).toBe("processing");
    const { url, init } = lastCall();
    expect(url).toBe("/video-generations");
    expect(init.method).toBe("POST");
    expect(init.body).toBe(JSON.stringify({ videoDefinitionId: "pl-a1-nasal-vowels-demo" }));
    expect(init.credentials).toBe("include");
  });

  it("never sends anything but the definition id — no userId, no status, in the body", async () => {
    await requestVideoGeneration("pl-a1-nasal-vowels-demo");

    const { init } = lastCall();
    expect(JSON.stringify(init.body)).not.toMatch(/userId|status/);
  });

  it("throws an ApiError with the server's fixed message on a non-2xx response", async () => {
    stub(404, { error: "Video definition not found." });

    await expect(requestVideoGeneration("pl-does-not-exist")).rejects.toMatchObject({
      message: "Video definition not found.",
      status: 404,
    });
  });

  it("throws an ApiError instance", async () => {
    stub(429, { error: "Too many requests." });

    await expect(requestVideoGeneration("pl-a1-nasal-vowels-demo")).rejects.toBeInstanceOf(
      ApiError,
    );
  });
});

describe("fetchVideoGenerationStatus", () => {
  it("gets the job by id and returns the parsed result", async () => {
    stub(200, { ...JOB, status: "completed", mediaReference: "fake:output.mp4" });

    const result = await fetchVideoGenerationStatus(JOB.id);

    expect(result.status).toBe("completed");
    expect(result.mediaReference).toBe("fake:output.mp4");
    const { url, init } = lastCall();
    expect(url).toBe(`/video-generations/${JOB.id}`);
    expect(init.method).toBeUndefined();
  });

  it("strips any extra field a response might carry (the schema is an allowlist)", async () => {
    stub(200, { ...JOB, userId: "user-1", providerJobReference: "internal-only" });

    const result = await fetchVideoGenerationStatus(JOB.id);

    expect(result).not.toHaveProperty("userId");
    expect(result).not.toHaveProperty("providerJobReference");
  });

  it("throws an ApiError on a 404", async () => {
    stub(404, { error: "Video generation job not found." });

    await expect(fetchVideoGenerationStatus("does-not-exist")).rejects.toMatchObject({
      status: 404,
    });
  });
});
