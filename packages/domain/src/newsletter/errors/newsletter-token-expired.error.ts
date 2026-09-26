/** A newsletter confirmation token past its expiry — the user can simply request a new one. */
export class NewsletterTokenExpiredError extends Error {
  constructor() {
    super("This newsletter confirmation link has expired.");
    this.name = "NewsletterTokenExpiredError";
  }
}
