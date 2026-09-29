import { describe, expect, it } from "vitest";

import { DEFAULT_HOMEPAGE_LOCALE, fillTemplate, homepageContent } from "./homepage-content.js";
import en from "./homepage.en.json";

describe("homepageContent", () => {
  it("returns the English copy by default and for any English variant", () => {
    expect(DEFAULT_HOMEPAGE_LOCALE).toBe("en");
    expect(homepageContent().hero.title).toBe(en.hero.title);
    expect(homepageContent("en-GB")).toBe(homepageContent("en"));
  });

  it("falls back to the default copy for a locale that has no translation yet", () => {
    expect(homepageContent("pl-PL")).toBe(homepageContent("en"));
  });

  it("names a chapter for every scene of the narrative (at least eight scenes)", () => {
    expect(Object.keys(homepageContent().chapters)).toHaveLength(10);
  });

  it("marks the correct example answer with an id that exists among the options", () => {
    const { options, correctOptionId } = homepageContent().practise;
    expect(options.map((option) => option.id)).toContain(correctOptionId);
  });

  it("sends calls to action only to routes the router defines", () => {
    const { guest, member } = homepageContent().cta;
    expect([guest.primary.to, guest.secondary.to, member.primary.to, member.secondary.to]).toEqual([
      "/register",
      "/learn",
      "/dashboard",
      "/learn/lessons",
    ]);
  });
});

describe("homepage copy makes no invented claims (M20A: no fake data, no marketing hyperbole)", () => {
  const copy = JSON.stringify(en).toLowerCase();

  it.each([
    ["percentages", /\d\s*%/],
    ["user or learner counts", /\d[\d,.]*\s*\+?\s*(?:users|learners|students|people|countries)/],
    ["ratings, reviews or testimonials", /\b(?:rated|rating|reviews?|testimonials?|trusted by)\b/],
    ["hyperbole", /\b(?:revolutionary|instantly|10x|fluent in|guaranteed|best)\b/],
    ["AI claims", /\bai[- ]powered\b/],
    ["price claims", /\b(?:free|pricing|subscription)\b/],
  ])("contains no %s", (_name, pattern) => {
    expect(copy).not.toMatch(pattern);
  });
});

describe("fillTemplate", () => {
  it("replaces named placeholders and leaves unknown ones", () => {
    expect(fillTemplate("{text} means {meaning} {other}", { text: "Tak", meaning: "yes" })).toBe(
      "Tak means yes {other}",
    );
  });
});
