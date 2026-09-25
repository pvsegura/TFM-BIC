import { createVocabularyItemId, VocabularyItemNotFoundError } from "@tfm-bic/domain";
import { beforeEach, describe, expect, it } from "vitest";

import { FakeContentRepository } from "../../content/test-support/fakes.js";
import {
  FakeVocabularyRepository,
  makeVocabularyCatalog,
} from "../../vocabulary/test-support/fakes.js";
import { AudioSourceTextMissingError } from "../errors/audio-generation-errors.js";
import { MapAudioCache, StubAudioGenerationService, audioOf } from "../test-support/fakes.js";
import { GenerateAudioUseCase } from "./generate-audio.use-case.js";
import { GenerateVocabularyAudioUseCase } from "./generate-vocabulary-audio.use-case.js";

let provider: StubAudioGenerationService;
let useCase: GenerateVocabularyAudioUseCase;

beforeEach(() => {
  const catalog = makeVocabularyCatalog();
  const content = new FakeContentRepository(catalog);
  const vocabulary = new FakeVocabularyRepository(catalog.vocabularyCategories, catalog.vocabulary);
  provider = new StubAudioGenerationService();
  provider.resolveWith(audioOf([1]));
  const generateAudio = new GenerateAudioUseCase(content, provider, new MapAudioCache(), {
    maxTextLength: 300,
    maxConcurrent: 4,
  });
  useCase = new GenerateVocabularyAudioUseCase(content, vocabulary, generateAudio);
});

const id = (value: string) => createVocabularyItemId(value);

describe("GenerateVocabularyAudioUseCase", () => {
  it("speaks the entry's own word, in the entry's own language — the text comes from content, never the client", async () => {
    await useCase.execute({ vocabularyItemId: id("pl-dom"), part: "lemma", voice: "standard" });

    expect(provider.calls).toEqual([
      { text: "dom", languageId: "pl", locale: "pl-PL", voice: "standard" },
    ]);
  });

  it("speaks the entry's example sentence when asked for it", async () => {
    await useCase.execute({ vocabularyItemId: id("pl-dom"), part: "example", voice: "slow" });

    expect(provider.calls[0]?.text).toBe("Mój dom jest mały.");
    expect(provider.calls[0]?.voice).toBe("slow");
  });

  it("refuses the example of an entry that has none", async () => {
    await expect(
      useCase.execute({ vocabularyItemId: id("pl-kot"), part: "example", voice: "standard" }),
    ).rejects.toThrow(AudioSourceTextMissingError);
    expect(provider.calls).toHaveLength(0);
  });

  it.each(["pl-nope", "pl-draft-word", "pl-hidden"])(
    "refuses an entry the student cannot see (%s) with the vocabulary not-found error",
    async (itemId) => {
      await expect(
        useCase.execute({ vocabularyItemId: id(itemId), part: "lemma", voice: "standard" }),
      ).rejects.toThrow(VocabularyItemNotFoundError);
      expect(provider.calls).toHaveLength(0);
    },
  );
});
