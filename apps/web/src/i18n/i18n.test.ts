import { describe, expect, it } from "vitest";

import { formatPrice, plural } from "./index.js";

describe("plural (Polish)", () => {
  const forms = ["słowo", "słowa", "słów"] as const;

  it.each([
    [1, "1 słowo"],
    [2, "2 słowa"],
    [4, "4 słowa"],
    [5, "5 słów"],
    [12, "12 słów"],
    [14, "14 słów"],
    [22, "22 słowa"],
    [25, "25 słów"],
    [0, "0 słów"],
  ])("%i → %s", (count, expected) => {
    expect(plural(count, forms)).toBe(expected);
  });
});

describe("formatPrice", () => {
  it("shows whole złoty without grosze and keeps grosze when present", () => {
    expect(formatPrice(4900, "PLN").replace(/\s/g, " ")).toBe("49 zł");
    expect(formatPrice(4990, "PLN").replace(/\s/g, " ")).toBe("49,90 zł");
  });
});
