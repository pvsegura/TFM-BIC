import type { VideoGenerationJobResponse } from "@tfm-bic/contracts";
import { renderWithProviders } from "@tfm-bic/testing";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRoutesStub } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "../services/api-error.js";
import * as authApi from "../services/auth-api.js";
import * as videoGenerationsApi from "../services/video-generations-api.js";
import { VideoGenerationDemoPage } from "./video-generation-demo-page.js";

const JOB_ID = "11111111-1111-4111-8111-111111111111";

function job(overrides: Partial<VideoGenerationJobResponse> = {}): VideoGenerationJobResponse {
  return {
    id: JOB_ID,
    videoDefinitionId: "pl-a1-nasal-vowels-demo",
    status: "processing",
    mediaReference: null,
    errorCategory: null,
    createdAt: "2026-01-01T10:00:00.000Z",
    updatedAt: "2026-01-01T10:00:00.000Z",
    completedAt: null,
    ...overrides,
  } as unknown as VideoGenerationJobResponse;
}

function renderAt(path: string) {
  const Stub = createRoutesStub([{ path: "/learn/videos", Component: VideoGenerationDemoPage }]);
  return renderWithProviders(<Stub initialEntries={[path]} />);
}

beforeEach(() => {
  vi.spyOn(authApi, "fetchCurrentUser").mockResolvedValue(null);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("VideoGenerationDemoPage", () => {
  it("shows the demo video's title, description and a Generate button", () => {
    renderAt("/learn/videos");

    expect(screen.getByText("Nasal vowels: ą and ę")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Generate video" })).toBeInTheDocument();
  });

  it("starts a generation, shows it processing, then completed — never sending anything but the definition id", async () => {
    const request = vi
      .spyOn(videoGenerationsApi, "requestVideoGeneration")
      .mockResolvedValue(job({ status: "processing" }));
    vi.spyOn(videoGenerationsApi, "fetchVideoGenerationStatus").mockResolvedValue(
      job({ status: "completed", mediaReference: "fake:pl-a1-nasal-vowels-demo/output.mp4" }),
    );
    renderAt("/learn/videos");

    await userEvent.click(screen.getByRole("button", { name: "Generate video" }));

    expect(request).toHaveBeenCalledWith("pl-a1-nasal-vowels-demo");
    expect(await screen.findByText("Your video is ready.")).toBeInTheDocument();
    expect(
      screen.getByText(/Preview is not available yet — media storage for generated videos/),
    ).toBeInTheDocument();
  });

  it("disables the button while a generation is in flight", async () => {
    vi.spyOn(videoGenerationsApi, "requestVideoGeneration").mockResolvedValue(
      job({ status: "processing" }),
    );
    vi.spyOn(videoGenerationsApi, "fetchVideoGenerationStatus").mockResolvedValue(
      job({ status: "processing" }),
    );
    renderAt("/learn/videos");

    await userEvent.click(screen.getByRole("button", { name: "Generate video" }));

    expect(await screen.findByText(/Generating your video/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Generate again" })).toBeDisabled();
  });

  it("shows a safe failure message and lets the student retry when generation fails", async () => {
    vi.spyOn(videoGenerationsApi, "requestVideoGeneration").mockResolvedValue(
      job({ status: "processing" }),
    );
    vi.spyOn(videoGenerationsApi, "fetchVideoGenerationStatus").mockResolvedValue(
      job({ status: "failed", errorCategory: "provider_rejected" }),
    );
    renderAt("/learn/videos");

    await userEvent.click(screen.getByRole("button", { name: "Generate video" }));

    expect(
      await screen.findByText("The video generation service could not process this request."),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
  });

  it("shows the server's own message when starting generation itself fails (e.g. rate limited)", async () => {
    vi.spyOn(videoGenerationsApi, "requestVideoGeneration").mockRejectedValue(
      new ApiError("Too many requests.", 429),
    );
    renderAt("/learn/videos");

    await userEvent.click(screen.getByRole("button", { name: "Generate video" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Too many requests.");
  });
});
