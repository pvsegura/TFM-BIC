import { createLanguageId, InvalidSpeechTextError } from "@tfm-bic/domain";
import { beforeEach, describe, expect, it } from "vitest";

import { FakeContentRepository, makeSampleCatalog } from "../../content/test-support/fakes.js";
import {
  AudioGenerationBusyError,
  AudioLanguageUnavailableError,
  AudioProviderRejectedError,
  AudioProviderUnavailableError,
} from "../errors/audio-generation-errors.js";
import { MapAudioCache, StubAudioGenerationService, audioOf } from "../test-support/fakes.js";
import { GenerateAudioUseCase } from "./generate-audio.use-case.js";

const pl = createLanguageId("pl");
const xx = createLanguageId("xx");

let content: FakeContentRepository;
let provider: StubAudioGenerationService;
let cache: MapAudioCache;
let useCase: GenerateAudioUseCase;

beforeEach(() => {
  content = new FakeContentRepository(makeSampleCatalog());
  provider = new StubAudioGenerationService();
  cache = new MapAudioCache();
  useCase = new GenerateAudioUseCase(content, provider, cache, {
    maxTextLength: 20,
    maxConcurrent: 2,
  });
});

describe("GenerateAudioUseCase", () => {
  it("asks the provider for the normalised text, the language and its locale, and the voice", async () => {
    provider.resolveWith(audioOf([1, 2, 3]));

    const result = await useCase.execute({ text: "  Mój  dom ", languageId: pl, voice: "slow" });

    expect(result.audio.data).toEqual(new Uint8Array([1, 2, 3]));
    expect(result.audio.format).toBe("audio/wav");
    expect(result.cached).toBe(false);
    expect(provider.calls).toEqual([
      { text: "Mój dom", languageId: "pl", locale: "pl-PL", voice: "slow" },
    ]);
  });

  it("works the same for any language in the catalog — nothing is specific to Polish", async () => {
    provider.resolveWith(audioOf([9]));

    await useCase.execute({ text: "hello", languageId: xx, voice: "standard" });

    expect(provider.calls[0]).toMatchObject({ languageId: "xx", locale: "xx" });
  });

  it("rejects invalid text before any provider call", async () => {
    provider.resolveWith(audioOf([1]));

    await expect(
      useCase.execute({ text: "   ", languageId: pl, voice: "standard" }),
    ).rejects.toThrow(InvalidSpeechTextError);
    await expect(
      useCase.execute({ text: "a".repeat(21), languageId: pl, voice: "standard" }),
    ).rejects.toThrow(InvalidSpeechTextError);
    expect(provider.calls).toHaveLength(0);
  });

  it("refuses a language that is unknown or inactive, before any provider call", async () => {
    provider.resolveWith(audioOf([1]));
    await expect(
      useCase.execute({ text: "dom", languageId: createLanguageId("zz"), voice: "standard" }),
    ).rejects.toThrow(AudioLanguageUnavailableError);

    content.catalog = {
      ...content.catalog,
      languages: content.catalog.languages.map((l) =>
        l.code === "pl" ? { ...l, isActive: false } : l,
      ),
    };
    await expect(
      useCase.execute({ text: "dom", languageId: pl, voice: "standard" }),
    ).rejects.toThrow(AudioLanguageUnavailableError);
    expect(provider.calls).toHaveLength(0);
  });

  it("passes provider failures through unchanged (already translated by the adapter)", async () => {
    provider.rejectWith(new AudioProviderUnavailableError("down"));

    await expect(
      useCase.execute({ text: "dom", languageId: pl, voice: "standard" }),
    ).rejects.toThrow(AudioProviderUnavailableError);
  });

  describe("reuse (idempotency)", () => {
    it("serves an identical request from the cache without calling the provider again", async () => {
      provider.resolveWith(audioOf([7]));

      await useCase.execute({ text: "dom", languageId: pl, voice: "standard" });
      const second = await useCase.execute({ text: " dom  ", languageId: pl, voice: "standard" });

      expect(second.cached).toBe(true);
      expect(second.audio.data).toEqual(new Uint8Array([7]));
      expect(provider.calls).toHaveLength(1);
    });

    it("does not reuse audio across voices or languages", async () => {
      provider.resolveWith(audioOf([7]));

      await useCase.execute({ text: "dom", languageId: pl, voice: "standard" });
      await useCase.execute({ text: "dom", languageId: pl, voice: "slow" });
      await useCase.execute({ text: "dom", languageId: xx, voice: "standard" });

      expect(provider.calls).toHaveLength(3);
    });

    it("never caches a failure — the next identical request tries again", async () => {
      provider.rejectWith(new AudioProviderRejectedError("no"));
      await expect(
        useCase.execute({ text: "dom", languageId: pl, voice: "standard" }),
      ).rejects.toThrow();

      provider.resolveWith(audioOf([1]));
      const result = await useCase.execute({ text: "dom", languageId: pl, voice: "standard" });

      expect(result.cached).toBe(false);
      expect(provider.calls).toHaveLength(2);
    });

    it("joins identical requests already in flight to one provider call (a double click costs once)", async () => {
      const pending = provider.deferred();

      const first = useCase.execute({ text: "dom", languageId: pl, voice: "standard" });
      const second = useCase.execute({ text: "dom", languageId: pl, voice: "standard" });
      await Promise.resolve();
      pending.resolve(audioOf([5]));

      const [a, b] = await Promise.all([first, second]);
      expect(provider.calls).toHaveLength(1);
      expect(a.audio.data).toEqual(b.audio.data);
    });
  });

  describe("concurrency limit", () => {
    it("refuses a new, different request while the limit is reached, and accepts again once one finishes", async () => {
      const one = provider.deferred();
      const a = useCase.execute({ text: "a", languageId: pl, voice: "standard" });
      provider.deferred();
      const b = useCase.execute({ text: "b", languageId: pl, voice: "standard" });
      await Promise.resolve();
      await Promise.resolve();

      await expect(
        useCase.execute({ text: "c", languageId: pl, voice: "standard" }),
      ).rejects.toThrow(AudioGenerationBusyError);

      one.resolve(audioOf([1]));
      await a;
      provider.resolveWith(audioOf([2]));
      await expect(
        useCase.execute({ text: "c", languageId: pl, voice: "standard" }),
      ).resolves.toBeDefined();
      void b.catch(() => undefined);
    });

    it("frees its slot when the provider fails", async () => {
      useCase = new GenerateAudioUseCase(content, provider, cache, {
        maxTextLength: 20,
        maxConcurrent: 1,
      });
      provider.rejectWith(new AudioProviderUnavailableError("down"));
      await expect(
        useCase.execute({ text: "a", languageId: pl, voice: "standard" }),
      ).rejects.toThrow();

      provider.resolveWith(audioOf([1]));
      await expect(
        useCase.execute({ text: "b", languageId: pl, voice: "standard" }),
      ).resolves.toBeDefined();
    });
  });
});
