import { describe, expect, it } from "vitest";

import { HmacUnsubscribeTokenCodec } from "./hmac-unsubscribe-token.codec.js";

const SECRET = "a-test-secret-that-is-long-enough-000000";

describe("HmacUnsubscribeTokenCodec", () => {
  it("round-trips a key", () => {
    const codec = new HmacUnsubscribeTokenCodec(SECRET);
    const token = codec.encode("opaque-key_123");

    expect(codec.decode(token)).toBe("opaque-key_123");
  });

  it("produces a URL-safe token that contains the key but a signature too", () => {
    const token = new HmacUnsubscribeTokenCodec(SECRET).encode("opaque-key");

    expect(token).toMatch(/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
    expect(token.startsWith("opaque-key.")).toBe(true);
  });

  it("rejects a token signed with another secret", () => {
    const forged = new HmacUnsubscribeTokenCodec("another-secret-another-secret-0000").encode("k");

    expect(new HmacUnsubscribeTokenCodec(SECRET).decode(forged)).toBeNull();
  });

  it("rejects a tampered key or signature", () => {
    const codec = new HmacUnsubscribeTokenCodec(SECRET);
    const [key, signature] = codec.encode("victim-key").split(".") as [string, string];

    expect(codec.decode(`other-key.${signature}`)).toBeNull();
    expect(codec.decode(`${key}.${signature.slice(0, -1)}A`)).toBeNull();
  });

  it.each(["", "no-dot", ".sig", "key.", "a.b.c", "key.not base64!"])(
    "rejects the malformed token %j",
    (token) => {
      expect(new HmacUnsubscribeTokenCodec(SECRET).decode(token)).toBeNull();
    },
  );

  it("refuses a short secret", () => {
    expect(() => new HmacUnsubscribeTokenCodec("short")).toThrow(/at least 32/);
  });
});
