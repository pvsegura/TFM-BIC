import type { EmailService } from "@tfm-bic/application";

export interface SentEmail {
  kind: "verification" | "password-reset";
  to: string;
  url: string;
  sentAt: Date;
}

/**
 * The only `EmailService` adapter wired in M3 — see ADR-014. Never sends
 * anything over the network; records messages in memory so tests (and
 * local manual testing) can retrieve the verification/reset link a real
 * provider would have emailed, without ever logging the link (tokens must
 * not be logged — see docs/security/security-baseline.md) or requiring
 * real provider credentials.
 */
export class InMemoryEmailService implements EmailService {
  private readonly sent: SentEmail[] = [];

  sendVerificationEmail(input: { to: string; verificationUrl: string }): Promise<void> {
    this.record({ kind: "verification", to: input.to, url: input.verificationUrl });
    return Promise.resolve();
  }

  sendPasswordResetEmail(input: { to: string; resetUrl: string }): Promise<void> {
    this.record({ kind: "password-reset", to: input.to, url: input.resetUrl });
    return Promise.resolve();
  }

  findLastSentTo(to: string): SentEmail | undefined {
    for (let i = this.sent.length - 1; i >= 0; i -= 1) {
      if (this.sent[i]?.to === to) {
        return this.sent[i];
      }
    }
    return undefined;
  }

  private record(input: { kind: SentEmail["kind"]; to: string; url: string }): void {
    this.sent.push({ ...input, sentAt: new Date() });
  }
}
