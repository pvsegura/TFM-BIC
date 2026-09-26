import { NEWSLETTER_CONSENT_VERSION } from "@tfm-bic/contracts";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "./api-error.js";
import {
  confirmNewsletterSubscription,
  fetchEmailPreferences,
  subscribeToNewsletter,
  unsubscribeFromNewsletter,
  unsubscribeWithToken,
} from "./email-preferences-api.js";

const PREFERENCES = {
  essential: { enabled: true, required: true },
  newsletter: { status: "not_subscribed", since: null },
};

function mockFetch(status: number, body: unknown) {
  const fn = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  });
  vi.stubGlobal("fetch", fn);
  return fn;
}

function lastCall(fn: ReturnType<typeof mockFetch>): [string, RequestInit] {
  return fn.mock.calls.at(-1) as [string, RequestInit];
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("email preferences API client", () => {
  it("GETs /email-preferences with the session cookie and parses the contract", async () => {
    const fn = mockFetch(200, { ...PREFERENCES, secret: "x" });

    const result = await fetchEmailPreferences();

    expect(result).toEqual(PREFERENCES);
    const [url, init] = lastCall(fn);
    expect(url).toBe("/email-preferences");
    expect(init.credentials).toBe("include");
  });

  it("subscribes with explicit consent and the consent text version — never an address", async () => {
    const fn = mockFetch(202, {
      newsletter: { status: "pending", since: "2026-09-26T10:00:00.000Z" },
      confirmationEmailSent: true,
    });

    const result = await subscribeToNewsletter();

    expect(result.newsletter.status).toBe("pending");
    const [url, init] = lastCall(fn);
    expect(url).toBe("/email-preferences/newsletter/subscription");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual({
      consent: true,
      consentVersion: NEWSLETTER_CONSENT_VERSION,
    });
  });

  it("unsubscribes with DELETE", async () => {
    const fn = mockFetch(200, { newsletter: { status: "not_subscribed", since: null } });

    const result = await unsubscribeFromNewsletter();

    expect(result.status).toBe("not_subscribed");
    expect(lastCall(fn)[1].method).toBe("DELETE");
  });

  it("confirms with the token in the body", async () => {
    const fn = mockFetch(200, {
      newsletter: { status: "subscribed", since: "2026-09-26T10:00:00.000Z" },
    });

    const result = await confirmNewsletterSubscription("tok");

    expect(result.status).toBe("subscribed");
    const [url, init] = lastCall(fn);
    expect(url).toBe("/email-preferences/newsletter/confirm");
    expect(JSON.parse(init.body as string)).toEqual({ token: "tok" });
  });

  it("unsubscribes by link with the token in the body", async () => {
    const fn = mockFetch(200, { status: "not_subscribed" });

    await unsubscribeWithToken("k.sig");

    const [url, init] = lastCall(fn);
    expect(url).toBe("/email-preferences/newsletter/unsubscribe");
    expect(JSON.parse(init.body as string)).toEqual({ token: "k.sig" });
  });

  it("turns an error response into an ApiError with the server's safe message", async () => {
    mockFetch(410, { error: "This confirmation link has expired." });

    await expect(confirmNewsletterSubscription("old")).rejects.toEqual(
      new ApiError("This confirmation link has expired.", 410),
    );
  });
});
