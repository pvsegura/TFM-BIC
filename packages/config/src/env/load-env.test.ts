import { describe, expect, it } from "vitest";

import { loadEnv } from "./load-env.js";

describe("loadEnv", () => {
  it("applies defaults when optional variables are absent (NODE_ENV=test)", () => {
    const env = loadEnv({ NODE_ENV: "test" });

    expect(env).toEqual({
      NODE_ENV: "test",
      PORT: 3000,
      DEFAULT_LANGUAGE: "pl",
      APP_BASE_URL: "http://localhost:5173",
    });
  });

  it("coerces PORT from a string and respects provided values", () => {
    const env = loadEnv({ NODE_ENV: "test", PORT: "4000", DEFAULT_LANGUAGE: "en" });

    expect(env.PORT).toBe(4000);
    expect(env.DEFAULT_LANGUAGE).toBe("en");
  });

  it("throws a readable error for an invalid NODE_ENV", () => {
    expect(() => loadEnv({ NODE_ENV: "not-an-env" })).toThrow(/Invalid environment configuration/);
  });

  it("requires DATABASE_URL outside of NODE_ENV=test (M3 — see ADR-005)", () => {
    expect(() => loadEnv({ NODE_ENV: "development" })).toThrow(/DATABASE_URL/);
  });

  it("accepts a provided DATABASE_URL outside of test", () => {
    const env = loadEnv({
      NODE_ENV: "development",
      DATABASE_URL: "postgres://user:pass@localhost:5432/db",
    });

    expect(env.DATABASE_URL).toBe("postgres://user:pass@localhost:5432/db");
  });

  it("does not require DATABASE_URL when NODE_ENV=test", () => {
    expect(() => loadEnv({ NODE_ENV: "test" })).not.toThrow();
  });

  it("requires AUTH_SESSION_SECRET in production (M3 — see ADR-006)", () => {
    expect(() =>
      loadEnv({
        NODE_ENV: "production",
        DATABASE_URL: "postgres://user:pass@localhost:5432/db",
      }),
    ).toThrow(/AUTH_SESSION_SECRET/);
  });

  it("requires AUTH_SESSION_SECRET in staging", () => {
    expect(() =>
      loadEnv({ NODE_ENV: "staging", DATABASE_URL: "postgres://user:pass@localhost:5432/db" }),
    ).toThrow(/AUTH_SESSION_SECRET/);
  });

  it("does not require AUTH_SESSION_SECRET in development", () => {
    expect(() =>
      loadEnv({
        NODE_ENV: "development",
        DATABASE_URL: "postgres://user:pass@localhost:5432/db",
      }),
    ).not.toThrow();
  });

  it("accepts a fully configured production environment", () => {
    const env = loadEnv({
      NODE_ENV: "production",
      DATABASE_URL: "postgres://user:pass@localhost:5432/db",
      AUTH_SESSION_SECRET: "a-production-secret",
      APP_BASE_URL: "https://app.example.com",
    });

    expect(env.AUTH_SESSION_SECRET).toBe("a-production-secret");
    expect(env.APP_BASE_URL).toBe("https://app.example.com");
  });
});
