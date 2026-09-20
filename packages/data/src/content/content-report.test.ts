import { describe, expect, it } from "vitest";

import { formatContentReport } from "./content-report.js";
import { loadContentCatalog } from "./load-content-catalog.js";
import { makeContentRoot, validTree } from "./test-support/content-fixtures.js";

describe("formatContentReport", () => {
  it("reports a valid catalog with counts and exit code 0", async () => {
    const handle = await makeContentRoot(validTree("xx"));
    try {
      const report = formatContentReport(await loadContentCatalog(handle.root));

      expect(report.exitCode).toBe(0);
      expect(report.text).toContain("Content is valid");
      expect(report.text).toContain("1 language");
      expect(report.text).toContain("1 content item");
    } finally {
      await handle.cleanup();
    }
  });

  it("lists every issue with its location and exits 1", () => {
    const report = formatContentReport({
      ok: false,
      issues: [
        { location: "languages/pl/language.json", message: "direction: bad" },
        { location: "catalog", message: "Duplicate content id." },
      ],
    });

    expect(report.exitCode).toBe(1);
    expect(report.text).toContain("2 problems");
    expect(report.text).toContain("languages/pl/language.json: direction: bad");
    expect(report.text).toContain("catalog: Duplicate content id.");
  });

  it("uses the singular for one problem", () => {
    const report = formatContentReport({ ok: false, issues: [{ location: "x", message: "y" }] });

    expect(report.text).toContain("1 problem");
    expect(report.text).not.toContain("1 problems");
  });
});
