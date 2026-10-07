/**
 * The provider did not accept a message. Carries no recipient or content, so it is safe to log;
 * the original error is kept as `cause` for adapters that need it, and is never shown to users.
 * `reason` is an optional, log-safe token set by the adapter (e.g. `http_403:validation_error`,
 * `timeout`) — never a provider message, which may echo an address.
 */
export class EmailDeliveryError extends Error {
  readonly reason: string | undefined;

  constructor(options?: { cause?: unknown; reason?: string }) {
    super(
      "The email could not be handed to the email provider.",
      options?.cause === undefined ? undefined : { cause: options.cause },
    );
    this.name = "EmailDeliveryError";
    this.reason = options?.reason;
  }
}
