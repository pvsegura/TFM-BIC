import { describe, expect, it } from "vitest";

import { formatContentReport } from "./content-report.js";
import { loadContentCatalog } from "./load-content-catalog.js";
import {
  exerciseFile,
  makeContentRoot,
  phoneticEntry,
  phoneticFile,
  validTree,
  videoFile,
  vocabularyEntry,
  vocabularyFile,
} from "./test-support/content-fixtures.js";

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

  it("counts the exercises too, and how many are published", async () => {
    const handle = await makeContentRoot({
      ...validTree("xx"),
      "languages/xx/levels/a1/exercises/xx-one-a.json": exerciseFile(
        "xx-one-a",
        "xx",
        "a1",
        "xx-one",
      ),
      "languages/xx/levels/a1/exercises/xx-one-b.json": exerciseFile(
        "xx-one-b",
        "xx",
        "a1",
        "xx-one",
        {
          order: 20,
          status: "draft",
        },
      ),
    });
    try {
      const report = formatContentReport(await loadContentCatalog(handle.root));

      expect(report.exitCode).toBe(0);
      expect(report.text).toContain("2 exercises (1 published)");
    } finally {
      await handle.cleanup();
    }
  });

  it("counts the vocabulary entries, how many are published and how many categories hold them", async () => {
    const handle = await makeContentRoot({
      ...validTree("xx"),
      "languages/xx/vocabulary/food.json": vocabularyFile("food", "xx", {
        items: [
          vocabularyEntry("xx-bread"),
          vocabularyEntry("xx-water", { order: 20 }),
          vocabularyEntry("xx-milk", { order: 30, status: "draft" }),
        ],
      }),
    });
    try {
      const report = formatContentReport(await loadContentCatalog(handle.root));

      expect(report.exitCode).toBe(0);
      expect(report.text).toContain("3 vocabulary entries (2 published) in 1 category");
    } finally {
      await handle.cleanup();
    }
  });

  it("reports zero vocabulary plainly when there is none", async () => {
    const handle = await makeContentRoot(validTree("xx"));
    try {
      const report = formatContentReport(await loadContentCatalog(handle.root));

      expect(report.text).toContain("0 vocabulary entries (0 published) in 0 categories");
    } finally {
      await handle.cleanup();
    }
  });

  it("reports zero exercises plainly when there are none", async () => {
    const handle = await makeContentRoot(validTree("xx"));
    try {
      const report = formatContentReport(await loadContentCatalog(handle.root));

      expect(report.text).toContain("0 exercises (0 published)");
    } finally {
      await handle.cleanup();
    }
  });

  it("counts the phonetic representations, how many are published and how many topics hold them", async () => {
    const handle = await makeContentRoot({
      ...validTree("xx"),
      "languages/xx/phonetics/consonants.json": phoneticFile("consonants", "xx", {
        items: [
          phoneticEntry("xx-ipa-ts"),
          phoneticEntry("xx-ipa-a", { order: 20 }),
          phoneticEntry("xx-ipa-b", { order: 30, status: "draft" }),
        ],
      }),
    });
    try {
      const report = formatContentReport(await loadContentCatalog(handle.root));

      expect(report.exitCode).toBe(0);
      expect(report.text).toContain("3 phonetic representations (2 published) in 1 topic");
    } finally {
      await handle.cleanup();
    }
  });

  it("reports zero phonetics plainly when there is none", async () => {
    const handle = await makeContentRoot(validTree("xx"));
    try {
      const report = formatContentReport(await loadContentCatalog(handle.root));

      expect(report.text).toContain("0 phonetic representations (0 published) in 0 topics");
    } finally {
      await handle.cleanup();
    }
  });

  it("counts the video definitions and how many are published", async () => {
    const handle = await makeContentRoot({
      ...validTree("xx"),
      "languages/xx/videos/xx-a1-one.json": videoFile("xx-a1-one", "xx", "a1"),
      "languages/xx/videos/xx-a1-two.json": videoFile("xx-a1-two", "xx", "a1", {
        order: 20,
        status: "draft",
      }),
    });
    try {
      const report = formatContentReport(await loadContentCatalog(handle.root));

      expect(report.exitCode).toBe(0);
      expect(report.text).toContain("2 video definitions (1 published)");
    } finally {
      await handle.cleanup();
    }
  });

  it("reports zero video definitions plainly when there is none", async () => {
    const handle = await makeContentRoot(validTree("xx"));
    try {
      const report = formatContentReport(await loadContentCatalog(handle.root));

      expect(report.text).toContain("0 video definitions (0 published)");
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
