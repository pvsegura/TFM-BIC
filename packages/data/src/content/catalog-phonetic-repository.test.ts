import {
  createLanguageId,
  createPhoneticRepresentationId,
  createPhoneticTopicId,
  type ContentCatalog,
  type PhoneticRepresentation,
  type PhoneticTopic,
} from "@tfm-bic/domain";
import { makePhoneticRepresentation, makePhoneticTopic } from "@tfm-bic/domain/testing";
import { describe, expect, it } from "vitest";

import { CatalogPhoneticRepository } from "./catalog-phonetic-repository.js";

const PL = createLanguageId("pl");
const XX = createLanguageId("xx");

const topics: PhoneticTopic[] = [
  makePhoneticTopic({ id: createPhoneticTopicId("consonants"), languageId: PL }),
  makePhoneticTopic({ id: createPhoneticTopicId("consonants"), languageId: XX }),
];

const representations: PhoneticRepresentation[] = [
  makePhoneticRepresentation({ id: createPhoneticRepresentationId("pl-ipa-ts"), languageId: PL }),
  makePhoneticRepresentation({
    id: createPhoneticRepresentationId("pl-ipa-draft"),
    languageId: PL,
    status: "draft",
  }),
  makePhoneticRepresentation({ id: createPhoneticRepresentationId("xx-ipa-ts"), languageId: XX }),
];

const catalog: ContentCatalog = {
  languages: [],
  languageLevels: [],
  content: [],
  exercises: [],
  vocabularyCategories: [],
  vocabulary: [],
  phoneticTopics: topics,
  phonetics: representations,
  videoDefinitions: [],
};
const repository = new CatalogPhoneticRepository(catalog);

describe("CatalogPhoneticRepository", () => {
  it("lists every topic of one language (visibility is the use cases' job)", async () => {
    expect((await repository.listTopics(PL)).map((t) => t.languageId)).toEqual([PL]);
  });

  it("finds a topic by language and id, or null", async () => {
    expect((await repository.findTopic(PL, createPhoneticTopicId("consonants")))?.languageId).toBe(
      PL,
    );
    expect(await repository.findTopic(PL, createPhoneticTopicId("nope"))).toBeNull();
    expect(await repository.findTopic(XX, createPhoneticTopicId("nope"))).toBeNull();
  });

  it("does not confuse two languages' topics sharing an id", async () => {
    const pl = await repository.findTopic(PL, createPhoneticTopicId("consonants"));
    const xx = await repository.findTopic(XX, createPhoneticTopicId("consonants"));

    expect(pl?.languageId).toBe(PL);
    expect(xx?.languageId).toBe(XX);
  });

  it("lists every representation of one language, of every status", async () => {
    expect((await repository.listRepresentations(PL)).map((r) => r.id).sort()).toEqual([
      "pl-ipa-draft",
      "pl-ipa-ts",
    ]);
  });

  it("lists nothing for a language with no phonetics", async () => {
    expect(await repository.listRepresentations(createLanguageId("zz"))).toEqual([]);
  });

  it("finds a representation by its id, or null", async () => {
    expect(
      (await repository.findRepresentation(createPhoneticRepresentationId("pl-ipa-draft")))?.status,
    ).toBe("draft");
    expect(
      await repository.findRepresentation(createPhoneticRepresentationId("pl-ipa-nope")),
    ).toBeNull();
  });

  it("does not resolve an inherited property name to a topic or a representation", async () => {
    expect(await repository.findTopic(PL, "__proto__" as never)).toBeNull();
    expect(await repository.findRepresentation("constructor" as never)).toBeNull();
  });

  it("offers no way to create or change a topic or a representation", () => {
    expect(Object.getOwnPropertyNames(Object.getPrototypeOf(repository) as object).sort()).toEqual([
      "constructor",
      "findRepresentation",
      "findTopic",
      "listRepresentations",
      "listTopics",
    ]);
  });
});
