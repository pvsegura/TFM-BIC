import { PhoneticRepresentationNotFoundError } from "@tfm-bic/domain";
import { describe, expect, it } from "vitest";

import { FakeContentRepository } from "../content/test-support/fakes.js";
import { findVisiblePhoneticRepresentation } from "./find-visible-phonetic-representation.js";
import { FakePhoneticContentRepository, makePhoneticsCatalog } from "./test-support/fakes.js";

const catalog = makePhoneticsCatalog();
const content = new FakeContentRepository(catalog);
const phonetics = new FakePhoneticContentRepository(catalog.phoneticTopics, catalog.phonetics);

async function find(id: string) {
  return findVisiblePhoneticRepresentation(content, phonetics, id as never);
}

describe("findVisiblePhoneticRepresentation", () => {
  it("returns a published representation in an available level and a published topic", async () => {
    const representation = await find("pl-ipa-ts");

    expect(representation.ipa).toBe("t͡ʂ");
  });

  it("returns a published representation that has no level at all", async () => {
    const representation = await find("pl-ipa-a");

    expect(representation.levelId).toBeUndefined();
  });

  it("returns a published representation that has no topic at all", async () => {
    const representation = await find("pl-ipa-no-topic");

    expect(representation.topicId).toBeUndefined();
  });

  it.each([
    ["an unknown id", "pl-ipa-nope"],
    ["a draft representation", "pl-ipa-draft"],
    ["a representation hidden behind a draft topic", "pl-ipa-hidden"],
  ])("refuses %s with the same not-found error", async (_name, id) => {
    await expect(find(id)).rejects.toThrow(PhoneticRepresentationNotFoundError);
  });

  it("refuses a representation of an inactive language", async () => {
    content.catalog = {
      ...catalog,
      languages: catalog.languages.map((l) => (l.code === "pl" ? { ...l, isActive: false } : l)),
    };

    await expect(find("pl-ipa-ts")).rejects.toThrow(PhoneticRepresentationNotFoundError);
    content.catalog = catalog;
  });

  it("refuses a published representation whose level is not available", async () => {
    phonetics.representations = [
      ...catalog.phonetics,
      {
        ...catalog.phonetics.find((r) => r.id === "pl-ipa-ts")!,
        id: "pl-ipa-planned" as never,
        levelId: "a2",
      },
    ];

    await expect(find("pl-ipa-planned")).rejects.toThrow(PhoneticRepresentationNotFoundError);
    phonetics.representations = [...catalog.phonetics];
  });
});
