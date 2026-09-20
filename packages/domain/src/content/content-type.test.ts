import { describe, expect, it } from "vitest";

import { CONTENT_STATUSES, isPublished, isValidContentStatus } from "./content-status.js";
import { CONTENT_TYPES, isValidContentType } from "./content-type.js";

describe("ContentType", () => {
  it("starts with the minimum M5 needs", () => {
    expect(CONTENT_TYPES).toEqual(["lesson", "explanation"]);
  });

  it.each(["lesson", "explanation"])("accepts %s", (type) => {
    expect(isValidContentType(type)).toBe(true);
  });

  it.each(["", "Lesson", "video", "exercise", "polish-lesson", "__proto__"])(
    "rejects %j",
    (type) => {
      expect(isValidContentType(type)).toBe(false);
    },
  );
});

describe("ContentStatus", () => {
  it("has draft, published and archived", () => {
    expect(CONTENT_STATUSES).toEqual(["draft", "published", "archived"]);
  });

  it.each(["draft", "published", "archived"])("accepts %s", (status) => {
    expect(isValidContentStatus(status)).toBe(true);
  });

  it.each(["", "Published", "live", "deleted"])("rejects %j", (status) => {
    expect(isValidContentStatus(status)).toBe(false);
  });

  it("only `published` content is visible to students", () => {
    expect(isPublished({ status: "published" })).toBe(true);
    expect(isPublished({ status: "draft" })).toBe(false);
    expect(isPublished({ status: "archived" })).toBe(false);
  });
});
