import {
  ContentNotFoundError,
  LanguageNotFoundError,
  LevelNotAvailableError,
} from "@tfm-bic/domain";
import { describe, expect, it } from "vitest";

import { mapCatalogError } from "./catalog-error.mapper.js";

describe("mapCatalogError", () => {
  it("maps each not-found error to a 404 with a fixed message that never echoes the input", () => {
    expect(mapCatalogError(new LanguageNotFoundError("<script>"))).toEqual({
      statusCode: 404,
      body: { error: "Language not found." },
    });
    expect(mapCatalogError(new LevelNotAvailableError("pl", "a2"))).toEqual({
      statusCode: 404,
      body: { error: "Level not available." },
    });
    expect(mapCatalogError(new ContentNotFoundError("pl-x"))).toEqual({
      statusCode: 404,
      body: { error: "Content not found." },
    });
  });

  it("rethrows anything unrecognised for the central 500 handler", () => {
    const unexpected = new Error("boom");

    expect(() => mapCatalogError(unexpected)).toThrow(unexpected);
  });
});
