import { describe, expect, it } from "vitest";

import {
  PERSONAL_DATA_EXPORT_VERSION,
  personalDataExportFileName,
} from "./personal-data-export.js";

describe("personal data export format", () => {
  it("is version 2 (no media section since video generation was retired)", () => {
    expect(PERSONAL_DATA_EXPORT_VERSION).toBe("2");
  });

  it("names the file after the product and the UTC date only — never a user id or address", () => {
    expect(personalDataExportFileName(new Date("2026-09-26T23:30:00.000Z"))).toBe(
      "verbysia-personal-data-2026-09-26.json",
    );
  });
});
