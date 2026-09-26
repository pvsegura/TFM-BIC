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
      EMAIL_PROVIDER: "fake",
      EMAIL_FROM: "TFM-BIC <no-reply@example.invalid>",
      TRUST_PROXY: [],
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
      AUTH_SESSION_SECRET: "a-production-session-secret-of-32+-chars",
      EMAIL_LINK_SECRET: "a-production-email-link-secret-of-32+-chars",
      APP_BASE_URL: "https://app.example.com",
    });

    expect(env.AUTH_SESSION_SECRET).toBe("a-production-session-secret-of-32+-chars");
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

  describe("email (M14, ADR-014/ADR-025)", () => {
    const dev = { NODE_ENV: "development", DATABASE_URL: "postgres://localhost/db" };
    const production = {
      NODE_ENV: "production",
      DATABASE_URL: "postgres://localhost/db",
      AUTH_SESSION_SECRET: "a-production-session-secret-of-32+-chars",
      APP_BASE_URL: "https://app.example.com",
    };

    it("defaults to the fake provider everywhere — no real email is ever sent by default", () => {
      expect(loadEnv(dev).EMAIL_PROVIDER).toBe("fake");
      expect(loadEnv({ NODE_ENV: "test" }).EMAIL_PROVIDER).toBe("fake");
    });

    it("rejects any provider other than fake (no real provider is selected yet)", () => {
      expect(() => loadEnv({ ...dev, EMAIL_PROVIDER: "resend" })).toThrow(/EMAIL_PROVIDER/);
    });

    it("accepts a sender and a reply-to address", () => {
      const env = loadEnv({
        ...dev,
        EMAIL_FROM: "Language School <hello@school.example>",
        EMAIL_REPLY_TO: "support@school.example",
      });
      expect(env.EMAIL_FROM).toBe("Language School <hello@school.example>");
      expect(env.EMAIL_REPLY_TO).toBe("support@school.example");
    });

    it.each(["EMAIL_FROM", "EMAIL_REPLY_TO"])(
      "refuses a line break in %s (header injection)",
      (name) => {
        expect(() => loadEnv({ ...dev, [name]: "a@example.com\r\nBcc: x@example.com" })).toThrow(
          new RegExp(name),
        );
      },
    );

    it("requires EMAIL_LINK_SECRET (≥ 32 characters) in production and staging", () => {
      expect(() => loadEnv(production)).toThrow(/EMAIL_LINK_SECRET/);
      expect(() => loadEnv({ ...production, NODE_ENV: "staging" })).toThrow(/EMAIL_LINK_SECRET/);
      expect(() => loadEnv({ ...production, EMAIL_LINK_SECRET: "too-short" })).toThrow(
        /EMAIL_LINK_SECRET/,
      );
      expect(
        loadEnv({ ...production, EMAIL_LINK_SECRET: "x".repeat(32) }).EMAIL_LINK_SECRET,
      ).toHaveLength(32);
    });

    it("does not require EMAIL_LINK_SECRET in development or test", () => {
      expect(loadEnv(dev).EMAIL_LINK_SECRET).toBeUndefined();
    });

    it("never echoes the secret's value in a configuration error", () => {
      const secret = "short-secret-value";
      try {
        loadEnv({ ...production, EMAIL_LINK_SECRET: secret });
        expect.unreachable();
      } catch (error) {
        expect(String(error)).not.toContain(secret);
      }
    });
  });

  describe("security hardening (M16)", () => {
    const production = {
      NODE_ENV: "production",
      DATABASE_URL: "postgres://user:pass@localhost:5432/db",
      AUTH_SESSION_SECRET: "a-production-session-secret-of-32+-chars",
      EMAIL_LINK_SECRET: "a-production-email-link-secret-of-32+-chars",
      APP_BASE_URL: "https://app.example.com",
    };

    it.each(["production", "staging"])(
      "refuses an AUTH_SESSION_SECRET shorter than 32 characters in %s, without echoing it",
      (nodeEnv) => {
        const weak = "secret-value-too-short";
        let message = "";
        try {
          loadEnv({ ...production, NODE_ENV: nodeEnv, AUTH_SESSION_SECRET: weak });
        } catch (error) {
          message = String(error);
        }
        expect(message).toMatch(/AUTH_SESSION_SECRET/);
        expect(message).not.toContain(weak);
      },
    );

    it("still accepts a short AUTH_SESSION_SECRET in development (local convenience)", () => {
      expect(() =>
        loadEnv({
          NODE_ENV: "development",
          DATABASE_URL: "postgres://x",
          AUTH_SESSION_SECRET: "dev",
        }),
      ).not.toThrow();
    });

    it.each(["production", "staging"])(
      "requires APP_BASE_URL to be set explicitly in %s (no localhost default)",
      (nodeEnv) => {
        const { APP_BASE_URL: _omitted, ...withoutBaseUrl } = production;
        expect(() => loadEnv({ ...withoutBaseUrl, NODE_ENV: nodeEnv })).toThrow(/APP_BASE_URL/);
      },
    );

    it.each(["production", "staging"])("requires an https APP_BASE_URL in %s", (nodeEnv) => {
      expect(() =>
        loadEnv({ ...production, NODE_ENV: nodeEnv, APP_BASE_URL: "http://app.example.com" }),
      ).toThrow(/APP_BASE_URL/);
    });

    it("refuses an APP_BASE_URL that is not an http(s) URL in any environment", () => {
      expect(() => loadEnv({ NODE_ENV: "test", APP_BASE_URL: "not a url" })).toThrow(
        /APP_BASE_URL/,
      );
      expect(() => loadEnv({ NODE_ENV: "test", APP_BASE_URL: "javascript:alert(1)" })).toThrow(
        /APP_BASE_URL/,
      );
    });

    it.each(["development", "staging", "production"])(
      "refuses E2E_RELAXED_RATE_LIMITS=true when NODE_ENV is %s",
      (nodeEnv) => {
        expect(() =>
          loadEnv({ ...production, NODE_ENV: nodeEnv, E2E_RELAXED_RATE_LIMITS: "true" }),
        ).toThrow(/E2E_RELAXED_RATE_LIMITS/);
      },
    );

    it("trusts no proxy by default", () => {
      expect(loadEnv({ NODE_ENV: "test" }).TRUST_PROXY).toEqual([]);
      expect(loadEnv(production).TRUST_PROXY).toEqual([]);
    });

    it("accepts an explicit list of proxy addresses and CIDR ranges", () => {
      expect(
        loadEnv({ ...production, TRUST_PROXY: " 10.0.0.0/8, 127.0.0.1 ,::1,fd00::/8" }).TRUST_PROXY,
      ).toEqual(["10.0.0.0/8", "127.0.0.1", "::1", "fd00::/8"]);
    });

    it.each(["true", "1", "2", "*", "all", "10.0.0.0/33", "localhost", "10.0.0.1,", "::1/129"])(
      "refuses TRUST_PROXY=%s (trust must name concrete proxies: hop counts and all let clients spoof X-Forwarded-For)",
      (value) => {
        expect(() => loadEnv({ ...production, TRUST_PROXY: value })).toThrow(/TRUST_PROXY/);
      },
    );
  });
});
