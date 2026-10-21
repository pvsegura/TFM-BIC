import { AudioProviderUnavailableError, type AudioGenerationService } from "@tfm-bic/application";
import { describe, expect, it } from "vitest";

import { DisabledAudioGenerationService } from "./disabled-generation-services.js";

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
});
