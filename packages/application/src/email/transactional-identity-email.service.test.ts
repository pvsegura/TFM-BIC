import { describe, expect, it } from "vitest";

import type { TransactionalEmailRequest, TransactionalEmailSender } from "./email-senders.js";
import { TransactionalIdentityEmailService } from "./transactional-identity-email.service.js";

class CapturingSender implements TransactionalEmailSender {
  readonly calls: { to: string; request: TransactionalEmailRequest }[] = [];
  send(to: string, request: TransactionalEmailRequest): Promise<void> {
    this.calls.push({ to, request });
    return Promise.resolve();
  }
}

describe("TransactionalIdentityEmailService", () => {
  it("sends the verification link through the email-verification template", async () => {
    const sender = new CapturingSender();
    const service = new TransactionalIdentityEmailService(sender);

    await service.sendVerificationEmail({
      to: "ada@example.com",
      verificationUrl: "https://app.example.com/verify-email?token=v",
    });

    expect(sender.calls).toEqual([
      {
        to: "ada@example.com",
        request: {
          template: "email-verification",
          variables: { verificationUrl: "https://app.example.com/verify-email?token=v" },
        },
      },
    ]);
  });

  it("sends the reset link through the password-reset template", async () => {
    const sender = new CapturingSender();
    const service = new TransactionalIdentityEmailService(sender);

    await service.sendPasswordResetEmail({
      to: "ada@example.com",
      resetUrl: "https://app.example.com/reset-password?token=r",
    });

    expect(sender.calls[0]!.request).toEqual({
      template: "password-reset",
      variables: { resetUrl: "https://app.example.com/reset-password?token=r" },
    });
  });
});
