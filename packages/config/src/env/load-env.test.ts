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
      AI_COACH_PROVIDER: "fake",
      AI_COACH_MODEL: "gemini-3.8-flash",
      EMAIL_PROVIDER: "fake",
      EMAIL_FROM: "TFM-BIC <no-reply@example.invalid>",
      TRUST_PROXY: [],
      APP_VERSION: "development",
      LOG_LEVEL: "info",
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

  it("accepts a fully configured staging environment", () => {
    const env = loadEnv({
      NODE_ENV: "staging",
      DATABASE_URL: "postgres://user:pass@db.internal:5432/db",
      AUTH_SESSION_SECRET: "a-staging-session-secret-of-32+-chars!!",
      EMAIL_LINK_SECRET: "a-staging-email-link-secret-of-32+-chars",
      APP_BASE_URL: "https://staging.example.com",
      WEB_DIST_DIR: "/app/web",
    });

    expect(env.AUTH_SESSION_SECRET).toBe("a-staging-session-secret-of-32+-chars!!");
    expect(env.APP_BASE_URL).toBe("https://staging.example.com");
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
      NODE_ENV: "staging",
      DATABASE_URL: "postgres://db.internal/db",
      AUTH_SESSION_SECRET: "a-production-session-secret-of-32+-chars",
      APP_BASE_URL: "https://app.example.com",
      WEB_DIST_DIR: "/app/web",
    };

    it("defaults to the fake provider everywhere — no real email is ever sent by default", () => {
      expect(loadEnv(dev).EMAIL_PROVIDER).toBe("fake");
      expect(loadEnv({ NODE_ENV: "test" }).EMAIL_PROVIDER).toBe("fake");
    });

    it("rejects an unknown provider", () => {
      expect(() => loadEnv({ ...dev, EMAIL_PROVIDER: "sendgrid" })).toThrow(/EMAIL_PROVIDER/);
    });

    describe("resend", () => {
      const resend = {
        ...dev,
        EMAIL_PROVIDER: "resend",
        RESEND_API_KEY: "re_test_key",
        EMAIL_FROM: "Verbysia <no-reply@verbysia.com>",
      };

      it("is accepted with an API key and a real sender", () => {
        const env = loadEnv(resend);
        expect(env.EMAIL_PROVIDER).toBe("resend");
        expect(env.RESEND_API_KEY).toBe("re_test_key");
      });

      it("requires RESEND_API_KEY", () => {
        const { RESEND_API_KEY: _omit, ...withoutKey } = resend;
        expect(() => loadEnv(withoutKey)).toThrow(/RESEND_API_KEY/);
      });

      it("requires EMAIL_FROM to be set (the placeholder sender would be rejected)", () => {
        const { EMAIL_FROM: _omit, ...withoutFrom } = resend;
        expect(() => loadEnv(withoutFrom)).toThrow(/EMAIL_FROM/);
      });

      it("is refused under NODE_ENV=test — automated tests never email anyone", () => {
        expect(() => loadEnv({ ...resend, NODE_ENV: "test" })).toThrow(/EMAIL_PROVIDER/);
      });

      it("never echoes the API key in a configuration error", () => {
        try {
          loadEnv({ ...resend, EMAIL_FROM: "bad\nheader" });
          expect.unreachable();
        } catch (error) {
          expect(String(error)).not.toContain("re_test_key");
        }
      });
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
      expect(() => loadEnv({ ...production, NODE_ENV: "production" })).toThrow(/EMAIL_LINK_SECRET/);
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
    // Staging: the deployed environment that can currently be satisfied (production also refuses
    // the fake providers — see the M17 block below).
    const production = {
      NODE_ENV: "staging",
      DATABASE_URL: "postgres://user:pass@db.internal:5432/db",
      WEB_DIST_DIR: "/app/web",
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

  describe("production readiness (M17)", () => {
    const staging = {
      NODE_ENV: "staging",
      DATABASE_URL: "postgres://app:pass@db.internal:5432/tfm_bic",
      AUTH_SESSION_SECRET: "s".repeat(32),
      EMAIL_LINK_SECRET: "e".repeat(32),
      APP_BASE_URL: "https://staging.example.com",
      WEB_DIST_DIR: "/app/web",
    };
    const production: Record<string, string> = {
      ...staging,
      NODE_ENV: "production",
      DATABASE_URL: "postgres://app:pass@db.example.com:5432/tfm_bic?sslmode=require",
      APP_BASE_URL: "https://app.example.com",
      AUDIO_GENERATION_PROVIDER: "disabled",
      VIDEO_GENERATION_PROVIDER: "disabled",
    };

    function configurationError(source: Record<string, string>): string {
      try {
        loadEnv(source);
      } catch (error) {
        return (error as Error).message;
      }
      return "";
    }

    it("accepts staging with the fake providers (safe, production-like)", () => {
      const env = loadEnv(staging);
      expect(env.EMAIL_PROVIDER).toBe("fake");
      expect(env.AUDIO_GENERATION_PROVIDER).toBe("fake");
      expect(env.VIDEO_GENERATION_PROVIDER).toBe("fake");
    });

    it("refuses the fake email provider in production — the only one that exists yet", () => {
      expect(configurationError(production)).toMatch(/EMAIL_PROVIDER/);
    });

    it.each(["AUDIO_GENERATION_PROVIDER", "VIDEO_GENERATION_PROVIDER"])(
      "refuses %s=fake in production, and when it is left at its default",
      (name) => {
        expect(configurationError({ ...production, [name]: "fake" })).toMatch(new RegExp(name));
        const withoutProvider = { ...production };
        delete withoutProvider[name];
        expect(configurationError(withoutProvider)).toMatch(new RegExp(name));
      },
    );

    it("accepts disabled for audio and video in every environment", () => {
      const env = loadEnv({
        NODE_ENV: "test",
        AUDIO_GENERATION_PROVIDER: "disabled",
        VIDEO_GENERATION_PROVIDER: "disabled",
      });
      expect(env.AUDIO_GENERATION_PROVIDER).toBe("disabled");
      expect(env.VIDEO_GENERATION_PROVIDER).toBe("disabled");
      expect(configurationError(production)).not.toMatch(/GENERATION_PROVIDER/);
    });

    it("refuses hyperframes in production (unverified adapter, no persistent media storage)", () => {
      expect(
        configurationError({ ...production, VIDEO_GENERATION_PROVIDER: "hyperframes" }),
      ).toMatch(/VIDEO_GENERATION_PROVIDER/);
    });

    it.each([
      "https://localhost",
      "https://localhost:5173",
      "https://127.0.0.1",
      "https://0.0.0.0",
      "https://[::1]",
    ])("refuses APP_BASE_URL=%s in staging and production", (url) => {
      expect(configurationError({ ...staging, APP_BASE_URL: url })).toMatch(/APP_BASE_URL/);
      expect(configurationError({ ...production, APP_BASE_URL: url })).toMatch(/APP_BASE_URL/);
    });

    it.each(["localhost", "127.0.0.1", "[::1]", "0.0.0.0"])(
      "refuses a DATABASE_URL on %s in production, without echoing the URL",
      (host) => {
        const url = `postgres://app:hunter2-db-pass@${host}:5432/tfm_bic?sslmode=require`;
        const message = configurationError({ ...production, DATABASE_URL: url });
        expect(message).toMatch(/DATABASE_URL/);
        expect(message).not.toContain("hunter2-db-pass");
      },
    );

    it("requires TLS (sslmode require, verify-ca or verify-full) on the production DATABASE_URL", () => {
      const withoutTls = "postgres://app:pass@db.example.com:5432/tfm_bic";
      expect(configurationError({ ...production, DATABASE_URL: withoutTls })).toMatch(
        /DATABASE_URL/,
      );
      expect(
        configurationError({ ...production, DATABASE_URL: `${withoutTls}?sslmode=disable` }),
      ).toMatch(/DATABASE_URL/);
      for (const mode of ["require", "verify-ca", "verify-full"]) {
        expect(
          configurationError({ ...production, DATABASE_URL: `${withoutTls}?sslmode=${mode}` }),
        ).not.toMatch(/DATABASE_URL/);
      }
    });

    it("refuses a DATABASE_URL that is not a postgres URL, outside of test", () => {
      expect(configurationError({ ...staging, DATABASE_URL: "mysql://db.internal/x" })).toMatch(
        /DATABASE_URL/,
      );
      expect(configurationError({ ...staging, DATABASE_URL: "not a url" })).toMatch(/DATABASE_URL/);
    });

    it.each(["staging", "production"])(
      "requires WEB_DIST_DIR in %s — the API serves the SPA from the same origin",
      (nodeEnv) => {
        const withoutDist = { ...(nodeEnv === "staging" ? staging : production) };
        delete (withoutDist as Record<string, string>).WEB_DIST_DIR;
        expect(configurationError({ ...withoutDist, NODE_ENV: nodeEnv })).toMatch(/WEB_DIST_DIR/);
      },
    );

    it("leaves WEB_DIST_DIR optional in development and test (Vite serves the SPA there)", () => {
      expect(loadEnv({ NODE_ENV: "test" }).WEB_DIST_DIR).toBeUndefined();
      expect(loadEnv({ NODE_ENV: "test", WEB_DIST_DIR: "/x" }).WEB_DIST_DIR).toBe("/x");
    });

    it("defaults APP_VERSION to development and accepts a build identifier", () => {
      expect(loadEnv({ NODE_ENV: "test" }).APP_VERSION).toBe("development");
      expect(loadEnv({ NODE_ENV: "test", APP_VERSION: "0.1.0+3ee4d5c" }).APP_VERSION).toBe(
        "0.1.0+3ee4d5c",
      );
    });

    it("defaults LOG_LEVEL to info and accepts the documented levels (M18)", () => {
      expect(loadEnv({ NODE_ENV: "test" }).LOG_LEVEL).toBe("info");
      for (const level of ["error", "warn", "info", "debug"]) {
        expect(loadEnv({ NODE_ENV: "test", LOG_LEVEL: level }).LOG_LEVEL).toBe(level);
      }
      expect(configurationError({ NODE_ENV: "test", LOG_LEVEL: "trace" })).toMatch(/LOG_LEVEL/);
    });

    it("refuses LOG_LEVEL=debug in production, allows it in staging (M18)", () => {
      expect(configurationError({ ...production, LOG_LEVEL: "debug" })).toMatch(/LOG_LEVEL/);
      expect(configurationError({ ...staging, LOG_LEVEL: "debug" })).not.toMatch(/LOG_LEVEL/);
    });

    it("leaves METRICS_TOKEN unset by default and requires at least 32 characters (M18)", () => {
      expect(loadEnv({ NODE_ENV: "test" }).METRICS_TOKEN).toBeUndefined();
      const token = "m".repeat(32);
      expect(loadEnv({ NODE_ENV: "test", METRICS_TOKEN: token }).METRICS_TOKEN).toBe(token);
      const message = configurationError({ NODE_ENV: "test", METRICS_TOKEN: "short-token-value" });
      expect(message).toMatch(/METRICS_TOKEN/);
      expect(message).not.toContain("short-token-value");
    });

    it.each(["has space", "a\nb", "<script>", "x".repeat(65)])(
      "refuses APP_VERSION=%j (it is shown by /health)",
      (value) => {
        expect(configurationError({ NODE_ENV: "test", APP_VERSION: value })).toMatch(/APP_VERSION/);
      },
    );

    it("lists every production problem at once, and never prints a secret value", () => {
      const secrets = {
        AUTH_SESSION_SECRET: "short-auth-secret",
        EMAIL_LINK_SECRET: "an-email-link-secret-that-is-long-enough-0",
        GEMINI_API_KEY: "gemini-key-value-123",
      };
      const message = configurationError({
        NODE_ENV: "production",
        DATABASE_URL: "postgres://app:db-password-456@localhost/x",
        APP_BASE_URL: "http://localhost:5173",
        ...secrets,
      });
      for (const name of [
        "AUTH_SESSION_SECRET",
        "APP_BASE_URL",
        "DATABASE_URL",
        "WEB_DIST_DIR",
        "EMAIL_PROVIDER",
        "AUDIO_GENERATION_PROVIDER",
        "VIDEO_GENERATION_PROVIDER",
      ]) {
        expect(message).toContain(name);
      }
      for (const value of [...Object.values(secrets), "db-password-456"]) {
        expect(message).not.toContain(value);
      }
    });
  });

  describe("AI Coach provider (M23, ADR-034)", () => {
    const dev = { NODE_ENV: "development", DATABASE_URL: "postgres://u:p@localhost:5432/db" };

    it("defaults to the fake provider — no Gemini key needed anywhere by default", () => {
      const env = loadEnv(dev);
      expect(env.AI_COACH_PROVIDER).toBe("fake");
      expect(env.GEMINI_AGENT_API_KEY).toBeUndefined();
      expect(env.AI_COACH_MODEL).toBe("gemini-3.8-flash");
    });

    it("accepts gemini with its own key, and a model override", () => {
      const env = loadEnv({
        ...dev,
        AI_COACH_PROVIDER: "gemini",
        GEMINI_AGENT_API_KEY: "k",
        AI_COACH_MODEL: "gemini-3.5-flash-lite",
      });
      expect(env.AI_COACH_PROVIDER).toBe("gemini");
      expect(env.AI_COACH_MODEL).toBe("gemini-3.5-flash-lite");
    });

    it("accepts gemini with the shared GEMINI_API_KEY as a fallback", () => {
      expect(
        loadEnv({ ...dev, AI_COACH_PROVIDER: "gemini", GEMINI_API_KEY: "k" }).AI_COACH_PROVIDER,
      ).toBe("gemini");
    });

    it("refuses gemini with no key at all, naming the coach-specific variable", () => {
      expect(() => loadEnv({ ...dev, AI_COACH_PROVIDER: "gemini" })).toThrow(
        /GEMINI_AGENT_API_KEY/,
      );
    });

    it("refuses gemini under NODE_ENV=test — automated tests never call a paid provider", () => {
      expect(() =>
        loadEnv({ NODE_ENV: "test", AI_COACH_PROVIDER: "gemini", GEMINI_AGENT_API_KEY: "k" }),
      ).toThrow(/AI_COACH_PROVIDER/);
    });

    it("refuses the fake coach in production — it answers without calling any provider", () => {
      expect(() =>
        loadEnv({
          NODE_ENV: "production",
          DATABASE_URL: "postgres://u:p@db.example.com:5432/db?sslmode=require",
          AUTH_SESSION_SECRET: "a".repeat(32),
          EMAIL_LINK_SECRET: "b".repeat(32),
          APP_BASE_URL: "https://app.example.com",
          EMAIL_PROVIDER: "fake",
          AI_COACH_PROVIDER: "fake",
        }),
      ).toThrow(/AI_COACH_PROVIDER/);
    });

    it("never echoes the coach key in a configuration error", () => {
      let message = "";
      try {
        loadEnv({ ...dev, GEMINI_AGENT_API_KEY: "coach-secret-value", PORT: "not-a-port" });
      } catch (error) {
        message = (error as Error).message;
      }
      expect(message).toContain("PORT");
      expect(message).not.toContain("coach-secret-value");
    });
  });
});
