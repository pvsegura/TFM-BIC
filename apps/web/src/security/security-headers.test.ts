import { describe, expect, it } from "vitest";

import { CONTENT_SECURITY_POLICY, WEB_SECURITY_HEADERS } from "./security-headers.js";

function directives(policy: string): Map<string, string[]> {
  return new Map(
    policy
      .split(";")
      .map((part) => part.trim().split(/\s+/))
      .filter((tokens) => tokens[0])
      .map(([name = "", ...values]) => [name, values]),
  );
}

describe("the SPA's Content-Security-Policy (M16, ADR-027)", () => {
  const policy = directives(CONTENT_SECURITY_POLICY);

  it("allows scripts from the app's own origin only — no inline script, no eval", () => {
    expect(policy.get("script-src")).toEqual(["'self'"]);
    expect(CONTENT_SECURITY_POLICY).not.toContain("unsafe-inline");
    expect(CONTENT_SECURITY_POLICY).not.toContain("unsafe-eval");
  });

  it("denies everything not explicitly needed", () => {
    expect(policy.get("default-src")).toEqual(["'none'"]);
    expect(policy.get("object-src")).toEqual(["'none'"]);
    expect(policy.get("base-uri")).toEqual(["'none'"]);
    expect(policy.get("form-action")).toEqual(["'self'"]);
    expect(policy.get("frame-ancestors")).toEqual(["'none'"]);
  });

  it("allows only what the app loads: its own styles, fonts, API calls, and blob: audio", () => {
    expect(policy.get("style-src")).toEqual(["'self'"]);
    expect(policy.get("font-src")).toEqual(["'self'"]);
    expect(policy.get("img-src")).toEqual(["'self'", "data:"]);
    expect(policy.get("connect-src")).toEqual(["'self'"]);
    expect(policy.get("media-src")).toEqual(["'self'", "blob:"]);
  });

  it("allows no third-party origin anywhere", () => {
    expect(CONTENT_SECURITY_POLICY).not.toMatch(/https?:|\*/);
  });
});

describe("the SPA's other security headers", () => {
  it("sends the CSP, nosniff, frame protection, no-referrer (reset links carry tokens) and a Permissions-Policy", () => {
    expect(WEB_SECURITY_HEADERS).toEqual({
      "Content-Security-Policy": CONTENT_SECURITY_POLICY,
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      "Referrer-Policy": "no-referrer",
      "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
      "Cross-Origin-Opener-Policy": "same-origin",
    });
  });
});
