/**
 * The consent was given for a different wording than the current one (a stale page). The user is
 * asked to reload and read the current text rather than being subscribed under text they did not
 * see.
 */
export class NewsletterConsentVersionMismatchError extends Error {
  constructor() {
    super("The newsletter consent text has changed. Please reload the page and try again.");
    this.name = "NewsletterConsentVersionMismatchError";
  }
}
