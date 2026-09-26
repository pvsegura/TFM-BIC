/**
 * Turns a subscription's opaque unsubscribe key into the token placed in unsubscribe links, and
 * back. The adapter signs the key (HMAC) so a leaked database alone does not let anyone build
 * working links, and the user id never appears in a link. Tokens do not expire: an unsubscribe
 * link in an old newsletter must keep working, and all it can do is withdraw consent.
 */
export interface UnsubscribeTokenCodec {
  encode(unsubscribeKey: string): string;
  /** The key, or `null` for a malformed or forged token. */
  decode(token: string): string | null;
}
