import { EmailDeliveryError } from "../email/email-delivery.error.js";

/**
 * Email failure semantics for the enumeration-resistant identity flows (M14, ADR-025): the
 * database changes stay committed (the account, the new token) and the caller gets the same
 * generic answer either way — a different answer would reveal that the address has an account.
 * The user recovers by asking again (resend verification / request another reset); the failure
 * itself is reported by the sender's delivery observer. Any other error still propagates.
 */
export async function ignoreEmailDeliveryFailure(send: () => Promise<void>): Promise<void> {
  try {
    await send();
  } catch (error) {
    if (!(error instanceof EmailDeliveryError)) {
      throw error;
    }
  }
}
