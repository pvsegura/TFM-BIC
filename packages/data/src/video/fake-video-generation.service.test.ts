import {
  VideoGenerationTimeoutError,
  VideoProviderRejectedError,
  VideoProviderUnavailableError,
} from "@tfm-bic/application";
import { describe, expect, it } from "vitest";

import { FakeVideoGenerationService } from "./fake-video-generation.service.js";

const REQUEST = {
  videoDefinitionId: "pl-a1-nasal-vowels-demo",
  scriptPath: "pl-a1-nasal-vowels-demo",
  title: "Nasal vowels",
};

describe("FakeVideoGenerationService", () => {
  it("succeeds for a definition with no configured scenario (the default, used by the real demo video)", async () => {
    const service = new FakeVideoGenerationService();

    const result = await service.generate(REQUEST);

    expect(result.providerJobReference).toBe("fake:pl-a1-nasal-vowels-demo");
    expect(result.mediaReference).toBe("fake:pl-a1-nasal-vowels-demo/output.mp4");
  });

  it("records every call it receives", async () => {
    const service = new FakeVideoGenerationService();

    await service.generate(REQUEST);

    expect(service.calls).toEqual([REQUEST]);
  });

  it("rejects with VideoProviderRejectedError for a definition mapped to provider-rejected", async () => {
    const service = new FakeVideoGenerationService(
      new Map([["pl-fails-demo", "provider-rejected"]]),
    );

    await expect(
      service.generate({ ...REQUEST, videoDefinitionId: "pl-fails-demo" }),
    ).rejects.toThrow(VideoProviderRejectedError);
  });

  it("rejects with VideoProviderUnavailableError for a definition mapped to provider-unavailable", async () => {
    const service = new FakeVideoGenerationService(
      new Map([["pl-unavailable-demo", "provider-unavailable"]]),
    );

    await expect(
      service.generate({ ...REQUEST, videoDefinitionId: "pl-unavailable-demo" }),
    ).rejects.toThrow(VideoProviderUnavailableError);
  });

  it("rejects with VideoGenerationTimeoutError for a definition mapped to timeout", async () => {
    const service = new FakeVideoGenerationService(new Map([["pl-slow-demo", "timeout"]]));

    await expect(
      service.generate({ ...REQUEST, videoDefinitionId: "pl-slow-demo" }),
    ).rejects.toThrow(VideoGenerationTimeoutError);
  });

  it("is deterministic: the same definition always produces the same outcome", async () => {
    const service = new FakeVideoGenerationService(
      new Map([["pl-fails-demo", "provider-rejected"]]),
    );

    const first = await service
      .generate({ ...REQUEST, videoDefinitionId: "pl-fails-demo" })
      .catch((error: unknown) => error);
    const second = await service
      .generate({ ...REQUEST, videoDefinitionId: "pl-fails-demo" })
      .catch((error: unknown) => error);

    expect(first).toBeInstanceOf(VideoProviderRejectedError);
    expect(second).toBeInstanceOf(VideoProviderRejectedError);
  });
});
