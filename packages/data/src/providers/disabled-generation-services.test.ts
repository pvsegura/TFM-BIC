import {
  AudioProviderUnavailableError,
  VideoProviderUnavailableError,
  type AudioGenerationService,
  type VideoGenerationService,
} from "@tfm-bic/application";
import { describe, expect, it } from "vitest";

import {
  DisabledAudioGenerationService,
  DisabledVideoGenerationService,
} from "./disabled-generation-services.js";

describe("disabled generation services (M17)", () => {
  it("audio: refuses every request as unavailable — no clip, no network", async () => {
    const service: AudioGenerationService = new DisabledAudioGenerationService();
    await expect(
      service.generate({
        text: "dom",
        languageId: "pl",
        voice: "standard",
      } as never),
    ).rejects.toBeInstanceOf(AudioProviderUnavailableError);
  });

  it("video: refuses every request as unavailable — no media, no process spawned", async () => {
    const service: VideoGenerationService = new DisabledVideoGenerationService();
    await expect(
      service.generate({
        videoDefinitionId: "x",
        scriptPath: "x",
        title: "x",
      }),
    ).rejects.toBeInstanceOf(VideoProviderUnavailableError);
  });
});
