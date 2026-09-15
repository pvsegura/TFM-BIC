import { describe, expect, it } from "vitest";

import { loadEnv } from "./load-env.js";

describe("loadEnv", () => {
  it("applies defaults when optional variables are absent", () => {
    const env = loadEnv({});

    expect(env).toEqual({
      NODE_ENV: "development",
      PORT: 3000,
      DEFAULT_LANGUAGE: "pl",
    });
  });

  it("coerces PORT from a string and respects provided values", () => {
    const env = loadEnv({ NODE_ENV: "test", PORT: "4000", DEFAULT_LANGUAGE: "en" });

    expect(env).toEqual({
      NODE_ENV: "test",
      PORT: 4000,
      DEFAULT_LANGUAGE: "en",
    });
  });

  it("throws a readable error for an invalid NODE_ENV", () => {
    expect(() => loadEnv({ NODE_ENV: "not-an-env" })).toThrow(/Invalid environment configuration/);
  });
});
