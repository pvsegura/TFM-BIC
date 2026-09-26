import { describe, expect, it } from "vitest";

import { PRIVACY_NOTICE, PRIVACY_NOTICE_VERSIONS } from "./privacy-notice.js";

describe("privacy notice content", () => {
  it("has an explicit, versioned identifier", () => {
    expect(PRIVACY_NOTICE.version).toMatch(/^privacy-policy-v\d+$/);
  });

  it("keeps every published version identifiable, the current one last", () => {
    const ids = PRIVACY_NOTICE_VERSIONS.map((entry) => entry.version);

    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.at(-1)).toBe(PRIVACY_NOTICE.version);
    expect(PRIVACY_NOTICE_VERSIONS.every((entry) => /^\d{4}-\d{2}-\d{2}$/.test(entry.date))).toBe(
      true,
    );
  });

  it("is marked as a draft pending legal review", () => {
    expect(PRIVACY_NOTICE.status).toBe("draft-pending-legal-review");
  });

  it("has unique section ids", () => {
    const ids = PRIVACY_NOTICE.sections.map((section) => section.id);

    expect(new Set(ids).size).toBe(ids.length);
  });
});
