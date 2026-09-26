import { createHmac, timingSafeEqual } from "node:crypto";

import type { UnsubscribeTokenCodec } from "@tfm-bic/application";

const MIN_SECRET_LENGTH = 32;
const BASE64URL = /^[A-Za-z0-9_-]+$/;
// Domain separation: this key signs nothing else, even if the secret were ever shared.
const PURPOSE = "newsletter-unsubscribe:";

/**
 * `<unsubscribeKey>.<HMAC-SHA256(secret, purpose + key)>`, both base64url (M14, ADR-025). The key
 * is a random value stored with the subscription (never the user id); the signature means a
 * database leak alone does not yield working unsubscribe links. No expiry, by design: links in old
 * newsletters must keep working, and the only thing a token can do is withdraw consent.
 */
export class HmacUnsubscribeTokenCodec implements UnsubscribeTokenCodec {
  constructor(private readonly secret: string) {
    if (secret.length < MIN_SECRET_LENGTH) {
      throw new Error(
        `The unsubscribe token secret must be at least ${MIN_SECRET_LENGTH} characters.`,
      );
    }
  }

  encode(unsubscribeKey: string): string {
    return `${unsubscribeKey}.${this.sign(unsubscribeKey)}`;
  }

  decode(token: string): string | null {
    const parts = token.split(".");
    if (parts.length !== 2) {
      return null;
    }
    const [key, signature] = parts as [string, string];
    if (!BASE64URL.test(key) || !BASE64URL.test(signature)) {
      return null;
    }
    const expected = Buffer.from(this.sign(key));
    const actual = Buffer.from(signature);
    if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
      return null;
    }
    return key;
  }

  private sign(key: string): string {
    return createHmac("sha256", this.secret)
      .update(PURPOSE + key)
      .digest("base64url");
  }
}
