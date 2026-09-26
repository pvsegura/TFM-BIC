/**
 * Raised when code tries to address marketing email to someone without a confirmed newsletter
 * subscription. A programming error, not a user-facing condition: the only way to obtain a
 * `MarketingRecipient` is `toMarketingRecipient`, which throws this.
 */
export class MarketingConsentRequiredError extends Error {
  constructor() {
    super("Marketing email requires a confirmed newsletter subscription.");
    this.name = "MarketingConsentRequiredError";
  }
}
