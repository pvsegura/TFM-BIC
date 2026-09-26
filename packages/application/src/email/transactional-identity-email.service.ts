import type { EmailService } from "../identity/ports/email-service.js";
import type { TransactionalEmailSender } from "./email-senders.js";

/**
 * Implements M3's identity `EmailService` port on top of the transactional sender (M14), so the
 * registration, resend and reset use cases stay unchanged while their emails gain real templates
 * and a provider boundary. Transactional: never checks, never needs marketing consent.
 */
export class TransactionalIdentityEmailService implements EmailService {
  constructor(private readonly sender: TransactionalEmailSender) {}

  sendVerificationEmail(input: { to: string; verificationUrl: string }): Promise<void> {
    return this.sender.send(input.to, {
      template: "email-verification",
      variables: { verificationUrl: input.verificationUrl },
    });
  }

  sendPasswordResetEmail(input: { to: string; resetUrl: string }): Promise<void> {
    return this.sender.send(input.to, {
      template: "password-reset",
      variables: { resetUrl: input.resetUrl },
    });
  }
}
