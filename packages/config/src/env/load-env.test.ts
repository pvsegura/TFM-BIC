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
      E2E_RELAXED_RATE_LIMITS: false,
      VIDEO_GENERATION_PROVIDER: "fake",
      AUDIO_GENERATION_PROVIDER: "fake",
      GEMINI_TTS_MODEL: "gemini-3.8-flash-tts",
      AUDIO_GENERATION_MAX_TEXT_LENGTH: 300,
    });
  });

  it("parses E2E_RELAXED_RATE_LIMITS=true, defaults to false otherwise", () => {
    expect(loadEnv({ NODE_ENV: "test" }).E2E_RELAXED_RATE_LIMITS).toBe(false);
    expect(
      loadEnv({ NODE_ENV: "test", E2E_RELAXED_RATE_LIMITS: "true" }).E2E_RELAXED_RATE_LIMITS,
    ).toBe(true);
  });

  it("leaves CONTENT_DIR unset by default and accepts an override (a non-empty path)", () => {
    expect(loadEnv({ NODE_ENV: "test" }).CONTENT_DIR).toBeUndefined();
    expect(loadEnv({ NODE_ENV: "test", CONTENT_DIR: "/srv/content" }).CONTENT_DIR).toBe(
      "/srv/content",
    );
    expect(() => loadEnv({ NODE_ENV: "test", CONTENT_DIR: "" })).toThrow(/CONTENT_DIR/);
  });

  it("coerces PORT from a string and respects provided values", () => {
    const env = loadEnv({ NODE_ENV: "test", PORT: "4000", DEFAULT_LANGUAGE: "en" });

    expect(env.PORT).toBe(4000);
    expect(env.DEFAULT_LANGUAGE).toBe("en");
  });

  it("defaults VIDEO_GENERATION_PROVIDER to fake, and accepts hyperframes explicitly", () => {
    expect(loadEnv({ NODE_ENV: "test" }).VIDEO_GENERATION_PROVIDER).toBe("fake");
    expect(
      loadEnv({ NODE_ENV: "test", VIDEO_GENERATION_PROVIDER: "hyperframes" })
        .VIDEO_GENERATION_PROVIDER,
    ).toBe("hyperframes");
  });

  it("rejects an unknown VIDEO_GENERATION_PROVIDER value", () => {
    expect(() => loadEnv({ NODE_ENV: "test", VIDEO_GENERATION_PROVIDER: "gemini" })).toThrow(
      /VIDEO_GENERATION_PROVIDER/,
    );
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

  describe("audio generation (M12, ADR-013)", () => {
    const dev = { NODE_ENV: "development", DATABASE_URL: "postgres://u:p@localhost:5432/db" };

    it("defaults to the fake provider — no Gemini key needed anywhere by default", () => {
      const env = loadEnv(dev);
      expect(env.AUDIO_GENERATION_PROVIDER).toBe("fake");
      expect(env.GEMINI_API_KEY).toBeUndefined();
    });

    it("accepts gemini with an API key, and a model override", () => {
      const env = loadEnv({
        ...dev,
        AUDIO_GENERATION_PROVIDER: "gemini",
        GEMINI_API_KEY: "k",
        GEMINI_TTS_MODEL: "gemini-3.8-flash-lite-tts",
      });
      expect(env.AUDIO_GENERATION_PROVIDER).toBe("gemini");
      expect(env.GEMINI_TTS_MODEL).toBe("gemini-3.8-flash-lite-tts");
    });

    it("refuses gemini without an API key, naming the variable", () => {
      expect(() => loadEnv({ ...dev, AUDIO_GENERATION_PROVIDER: "gemini" })).toThrow(
        /GEMINI_API_KEY/,
      );
    });

    it("never echoes the API key's value in a configuration error", () => {
      let message = "";
      try {
        loadEnv({ ...dev, GEMINI_API_KEY: "super-secret-value", PORT: "not-a-port" });
      } catch (error) {
        message = (error as Error).message;
      }
      expect(message).toContain("PORT");
      expect(message).not.toContain("super-secret-value");
    });

    it("refuses gemini under NODE_ENV=test — automated tests never call a paid provider", () => {
      expect(() =>
        loadEnv({ NODE_ENV: "test", AUDIO_GENERATION_PROVIDER: "gemini", GEMINI_API_KEY: "k" }),
      ).toThrow(/AUDIO_GENERATION_PROVIDER/);
    });

    it("rejects an unknown provider", () => {
      expect(() => loadEnv({ ...dev, AUDIO_GENERATION_PROVIDER: "hyperframes" })).toThrow(
        /AUDIO_GENERATION_PROVIDER/,
      );
    });

    it("bounds the configurable text limit between 1 and the domain ceiling of 500", () => {
      const env = loadEnv({ ...dev, AUDIO_GENERATION_MAX_TEXT_LENGTH: "120" });
      expect(env.AUDIO_GENERATION_MAX_TEXT_LENGTH).toBe(120);
      expect(() => loadEnv({ ...dev, AUDIO_GENERATION_MAX_TEXT_LENGTH: "0" })).toThrow();
      expect(() => loadEnv({ ...dev, AUDIO_GENERATION_MAX_TEXT_LENGTH: "501" })).toThrow();
    });
  });
});
