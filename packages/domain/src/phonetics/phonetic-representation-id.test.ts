import { describe, expect, it } from "vitest";

import { InvalidPhoneticRepresentationIdError } from "./errors/invalid-phonetic-representation-id.error.js";
import {
  createPhoneticRepresentationId,
  isValidPhoneticRepresentationId,
  phoneticRepresentationIdBelongsToLanguage,
} from "./phonetic-representation-id.js";

describe("PhoneticRepresentationId", () => {
  it.each(["pl-ipa-ts", "pl-ipa-a", "xx-ipa-a1", "es-ipa-rr"])("accepts %s", (id) => {
    expect(isValidPhoneticRepresentationId(id)).toBe(true);
    expect(createPhoneticRepresentationId(id)).toBe(id);
  });

  it.each([
    "",
    "Pl-Ipa-Ts",
    "pl_ipa_ts",
    "pl--ipa-ts",
    "-pl-ipa-ts",
    "pl-ipa-ts-",
    "1pl-ipa-ts",
    "pl ipa ts",
    "pl/ipa/ts",
    "../etc/passwd",
    "<script>",
    "pl-ipa'; DROP TABLE user_phonetic_progress;--",
    "pl-ʂ",
    `pl-${"a".repeat(62)}`,
  ])("rejects %j", (id) => {
    expect(isValidPhoneticRepresentationId(id)).toBe(false);
    expect(() => createPhoneticRepresentationId(id)).toThrow(InvalidPhoneticRepresentationIdError);
  });

  it("accepts an id of exactly 64 characters and rejects 65", () => {
    expect(isValidPhoneticRepresentationId(`pl-${"a".repeat(61)}`)).toBe(true);
    expect(isValidPhoneticRepresentationId(`pl-${"a".repeat(62)}`)).toBe(false);
  });

  it("is namespaced by language, so a misfiled representation can be detected", () => {
    const id = createPhoneticRepresentationId("pl-ipa-ts");

    expect(phoneticRepresentationIdBelongsToLanguage(id, "pl" as never)).toBe(true);
    expect(phoneticRepresentationIdBelongsToLanguage(id, "en" as never)).toBe(false);
    expect(phoneticRepresentationIdBelongsToLanguage(id, "p" as never)).toBe(false);
  });
});
