import { afterEach, describe, expect, it } from "vitest";

import { LANGUAGE } from "../i18n/index.js";
import { chooseCourse, instructionFor } from "./course-choice.js";

afterEach(() => {
  localStorage.clear();
});

describe("course choice", () => {
  it("follows the interface language until the learner picks a course", () => {
    expect(instructionFor("xx")).toBe(LANGUAGE);
  });

  it("remembers the chosen course per language, without touching other languages", () => {
    chooseCourse("xx", "yy");

    expect(instructionFor("xx")).toBe("yy");
    expect(instructionFor("zz")).toBe(LANGUAGE);
  });
});
