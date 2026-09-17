/** No token row matched the given hash at all (malformed/guessed token). */
export class InvalidTokenError extends Error {
  constructor() {
    super("This link is invalid.");
    this.name = "InvalidTokenError";
  }
}
