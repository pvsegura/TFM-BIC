import { describe, expect, it } from "vitest";

import { DATA_CLASSIFICATIONS, isExportableClassification } from "./data-classification.js";

describe("data classification", () => {
  it("has exactly the four documented classes", () => {
    expect(DATA_CLASSIFICATIONS).toEqual(["PUBLIC", "INTERNAL", "PERSONAL", "SECURITY_SENSITIVE"]);
  });

  it("exports personal data only", () => {
    expect(isExportableClassification("PERSONAL")).toBe(true);
  });

  it.each(["PUBLIC", "INTERNAL", "SECURITY_SENSITIVE"] as const)(
    "never exports %s data",
    (classification) => {
      expect(isExportableClassification(classification)).toBe(false);
    },
  );
});
