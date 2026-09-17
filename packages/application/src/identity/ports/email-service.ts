/**
 * Transactional email — kept distinct from the (not-yet-implemented)
 * Newsletter context, see ADR-014. `packages/data`'s `InMemoryEmailService`
 * is the only adapter wired in M3 (dev/test); a real provider adapter is a
 * documented follow-up.
 */
export interface EmailService {
  sendVerificationEmail(input: { to: string; verificationUrl: string }): Promise<void>;
  sendPasswordResetEmail(input: { to: string; resetUrl: string }): Promise<void>;
}
