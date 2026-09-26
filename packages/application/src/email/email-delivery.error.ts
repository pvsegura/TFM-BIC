/**
 * The provider did not accept a message. Carries no recipient or content, so it is safe to log;
 * the original error is kept as `cause` for adapters that need it, and is never shown to users.
 */
export class EmailDeliveryError extends Error {
  constructor(options?: { cause?: unknown }) {
    super("The email could not be handed to the email provider.", options);
    this.name = "EmailDeliveryError";
  }
}
