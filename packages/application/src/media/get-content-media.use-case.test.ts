import {
  ContentMediaNotFoundError,
  createGrammarTopicId,
  createLanguageId,
  type ContentMedia,
  type GrammarTopic,
  type MediaContentRef,
} from "@verbysia/domain";
import { describe, expect, it } from "vitest";

import { FakeContentRepository } from "../content/test-support/fakes.js";
import type { GrammarReferenceRepository } from "../grammar/grammar-reference.js";
import {
  FakeVocabularyRepository,
  makeVocabularyCatalog,
} from "../vocabulary/test-support/fakes.js";
import { GetContentMediaUseCase } from "./get-content-media.use-case.js";
import type { ContentMediaCatalog } from "./ports/media-generation-ports.js";

const pl = createLanguageId("pl");

function mediaOf(type: MediaContentRef["type"], id: string): ContentMedia {
  return { content: { type, id, languageId: pl }, audio: [] };
}

const catalogMedia: ContentMediaCatalog = {
  find: (ref) => mediaOf(ref.type, ref.id),
  list: () => [],
};

const topic = (status: GrammarTopic["status"]) =>
  ({ id: createGrammarTopicId("pl-ref-pronouns"), languageId: pl, status }) as GrammarTopic;

function grammarWith(found: GrammarTopic | null): GrammarReferenceRepository {
  return { listTopics: () => Promise.resolve([]), findTopic: () => Promise.resolve(found) };
}

function useCase(options: { polishActive?: boolean; grammar?: GrammarReferenceRepository } = {}) {
  const catalog = makeVocabularyCatalog();
  catalog.languages = catalog.languages.map((language) =>
    language.code === pl ? { ...language, isActive: options.polishActive ?? true } : language,
  );
  return new GetContentMediaUseCase({
    contentRepository: new FakeContentRepository(catalog),
    vocabulary: new FakeVocabularyRepository(catalog.vocabularyCategories, catalog.vocabulary),
    grammar: options.grammar,
    catalog: catalogMedia,
  });
}

describe("GetContentMediaUseCase", () => {
  it("returns a visible lesson's media", async () => {
    const media = await useCase().execute({ type: "lesson", id: "pl-first" });

    expect(media?.content).toMatchObject({ type: "lesson", id: "pl-first" });
  });

  it("returns a visible word's media", async () => {
    const media = await useCase().execute({ type: "vocabulary-item", id: "pl-dom" });

    expect(media?.content).toMatchObject({ type: "vocabulary-item", id: "pl-dom" });
  });

  it("returns a published grammar topic's media", async () => {
    const media = await useCase({ grammar: grammarWith(topic("published")) }).execute({
      type: "grammar-topic",
      id: "pl-ref-pronouns",
    });

    expect(media?.content).toMatchObject({ type: "grammar-topic", id: "pl-ref-pronouns" });
  });

  it.each<[string, MediaContentRef["type"], string]>([
    ["a draft lesson", "lesson", "pl-draft"],
    ["an unknown lesson", "lesson", "pl-nope"],
    ["a lesson in a planned level", "lesson", "pl-later"],
    ["an unknown word", "vocabulary-item", "pl-nope"],
    ["a malformed id", "lesson", "Not_An_Id"],
  ])("refuses %s", async (_, type, id) => {
    await expect(useCase().execute({ type, id })).rejects.toBeInstanceOf(ContentMediaNotFoundError);
  });

  it("refuses a lesson and a word of an inactive language", async () => {
    const hidden = useCase({ polishActive: false });

    await expect(hidden.execute({ type: "lesson", id: "pl-first" })).rejects.toBeInstanceOf(
      ContentMediaNotFoundError,
    );
    await expect(hidden.execute({ type: "vocabulary-item", id: "pl-dom" })).rejects.toBeInstanceOf(
      ContentMediaNotFoundError,
    );
  });

  it("refuses a draft grammar topic, and any topic when there is no grammar reference", async () => {
    const ref = { type: "grammar-topic", id: "pl-ref-pronouns" } as const;

    await expect(
      useCase({ grammar: grammarWith(topic("draft")) }).execute(ref),
    ).rejects.toBeInstanceOf(ContentMediaNotFoundError);
    await expect(useCase().execute(ref)).rejects.toBeInstanceOf(ContentMediaNotFoundError);
  });
});
