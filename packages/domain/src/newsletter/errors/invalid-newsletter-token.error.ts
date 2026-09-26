/**
 * A newsletter confirmation token that matches no pending request — unknown, already used, or
 * cancelled by an unsubscribe. Deliberately one error for all three, like M3's `InvalidTokenError`.
 */
export class InvalidNewsletterTokenError extends Error {
  constructor() {
    super("This newsletter link is invalid or has already been used.");
    this.name = "InvalidNewsletterTokenError";
  }
}
