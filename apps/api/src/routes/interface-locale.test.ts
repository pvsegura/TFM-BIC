import { describe, expect, it } from "vitest";

import { parseAcceptLanguage } from "./interface-locale.js";

describe("parseAcceptLanguage", () => {
  it("is empty when there is no header", () => {
    expect(parseAcceptLanguage(undefined)).toEqual([]);
    expect(parseAcceptLanguage("")).toEqual([]);
  });

  it("lists the languages asked for, best first", () => {
    expect(parseAcceptLanguage("es-ES,es;q=0.9,en;q=0.8")).toEqual(["es-ES", "es", "en"]);
    expect(parseAcceptLanguage("en;q=0.5, pl;q=0.9, de")).toEqual(["de", "pl", "en"]);
  });

  it("drops languages the client refuses (q=0) and malformed weights", () => {
    expect(parseAcceptLanguage("en;q=0, pl")).toEqual(["pl"]);
    expect(parseAcceptLanguage("en;q=abc, pl;q=0.4")).toEqual(["en", "pl"]);
  });

  it("keeps the given order among equally weighted languages", () => {
    expect(parseAcceptLanguage("b, a, c")).toEqual(["b", "a", "c"]);
  });

  it("ignores anything that is not a language tag, so a header can inject nothing", () => {
    expect(parseAcceptLanguage("en, <script>alert(1)</script>, ../etc, pl-PL")).toEqual([
      "en",
      "pl-PL",
    ]);
  });

  it("caps how many entries it reads and how long a tag may be", () => {
    const letters = (n: number) => String.fromCharCode(97 + (n % 26), 97 + Math.floor(n / 26));
    const many = Array.from({ length: 50 }, (_, n) => letters(n)).join(",");
    expect(parseAcceptLanguage(many)).toHaveLength(10);
    expect(parseAcceptLanguage(`${"a".repeat(60)}, en`)).toEqual(["en"]);
  });
});
