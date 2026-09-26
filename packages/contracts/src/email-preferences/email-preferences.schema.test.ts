import { NEWSLETTER_CONSENT_VERSION } from "@tfm-bic/domain";
import { describe, expect, it } from "vitest";

import {
  emailPreferencesResponseSchema,
  newsletterSubscriptionRequestSchema,
  newsletterSubscriptionResponseSchema,
  newsletterTokenRequestSchema,
} from "./email-preferences.schema.js";

describe("newsletterSubscriptionRequestSchema", () => {
  it("accepts an explicit consent with the consent text version", () => {
    expect(
      newsletterSubscriptionRequestSchema.safeParse({
        consent: true,
        consentVersion: NEWSLETTER_CONSENT_VERSION,
      }).success,
    ).toBe(true);
  });

  it.each([
    ["consent: false", { consent: false, consentVersion: NEWSLETTER_CONSENT_VERSION }],
    [
      "a truthy non-boolean consent",
      { consent: "yes", consentVersion: NEWSLETTER_CONSENT_VERSION },
    ],
    ["a missing consent", { consentVersion: NEWSLETTER_CONSENT_VERSION }],
    ["a missing version", { consent: true }],
    ["an empty version", { consent: true, consentVersion: "" }],
    ["an over-long version", { consent: true, consentVersion: "v".repeat(101) }],
    [
      "an email address (the address always comes from the session)",
      { consent: true, consentVersion: NEWSLETTER_CONSENT_VERSION, email: "x@example.com" },
    ],
    [
      "a user id (the user always comes from the session)",
      { consent: true, consentVersion: NEWSLETTER_CONSENT_VERSION, userId: "u" },
    ],
  ])("rejects %s", (_label, body) => {
    expect(newsletterSubscriptionRequestSchema.safeParse(body).success).toBe(false);
  });
});

describe("newsletterTokenRequestSchema", () => {
  it("accepts a token", () => {
    expect(newsletterTokenRequestSchema.safeParse({ token: "abc" }).success).toBe(true);
  });

  it.each([{}, { token: "" }, { token: "x".repeat(513) }, { token: "abc", extra: 1 }])(
    "rejects %j",
    (body) => {
      expect(newsletterTokenRequestSchema.safeParse(body).success).toBe(false);
    },
  );
});

describe("emailPreferencesResponseSchema", () => {
  it("accepts the documented shape", () => {
    expect(
      emailPreferencesResponseSchema.parse({
        essential: { enabled: true, required: true },
        newsletter: { status: "subscribed", since: "2026-09-26T10:00:00.000Z" },
      }),
    ).toBeTruthy();
  });

  it("strips anything outside the allowlist (e.g. a stored token or key)", () => {
    const parsed = emailPreferencesResponseSchema.parse({
      essential: { enabled: true, required: true },
      newsletter: { status: "pending", since: null, unsubscribeKey: "secret" },
      confirmationTokenHash: "secret",
    });
    expect(JSON.stringify(parsed)).not.toContain("secret");
  });

  it("never allows essential email to be reported as disabled", () => {
    expect(
      emailPreferencesResponseSchema.safeParse({
        essential: { enabled: false, required: true },
        newsletter: { status: "not_subscribed", since: null },
      }).success,
    ).toBe(false);
  });
});

describe("newsletterSubscriptionResponseSchema", () => {
  it("accepts a pending result", () => {
    expect(
      newsletterSubscriptionResponseSchema.safeParse({
        newsletter: { status: "pending", since: "2026-09-26T10:00:00.000Z" },
        confirmationEmailSent: true,
      }).success,
    ).toBe(true);
  });
});
