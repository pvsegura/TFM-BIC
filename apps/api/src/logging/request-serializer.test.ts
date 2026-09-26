import { describe, expect, it } from "vitest";

import { pathWithoutQuery, serializeRequest } from "./request-serializer.js";

describe("pathWithoutQuery", () => {
  it.each([
    [
      "/email-preferences/newsletter/unsubscribe?token=secret.sig",
      "/email-preferences/newsletter/unsubscribe",
    ],
    ["/health", "/health"],
    ["/a?b=1#c", "/a"],
    ["/a#frag", "/a"],
  ])("%s → %s", (url, expected) => {
    expect(pathWithoutQuery(url)).toBe(expected);
  });
});

describe("serializeRequest", () => {
  it("logs the method and path but never the query string (tokens travel there)", () => {
    const serialized = serializeRequest({
      method: "POST",
      url: "/email-preferences/newsletter/unsubscribe?token=secret.sig",
      host: "api.example.com",
      ip: "203.0.113.9",
    });

    expect(serialized).toEqual({
      method: "POST",
      url: "/email-preferences/newsletter/unsubscribe",
      host: "api.example.com",
      remoteAddress: "203.0.113.9",
    });
    expect(JSON.stringify(serialized)).not.toContain("secret");
  });
});
