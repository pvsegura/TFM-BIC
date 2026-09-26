/**
 * The identity flows' view of transactional email (M3). Since M14 it is implemented by
 * `TransactionalIdentityEmailService` (packages/application/src/email), which renders the named
 * templates and hands them to the configured `EmailProvider` — see ADR-014 and ADR-025. It is
 * transactional only: kept apart from the Newsletter context's marketing sender and consent.
 * Implementations reject with `EmailDeliveryError` when the provider does not accept a message.
 */
export interface EmailService {
  sendVerificationEmail(input: { to: string; verificationUrl: string }): Promise<void>;
  sendPasswordResetEmail(input: { to: string; resetUrl: string }): Promise<void>;
}
