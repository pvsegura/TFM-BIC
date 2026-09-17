import { describe, expect, it } from "vitest";

import { InMemoryEmailService } from "./in-memory-email.service.js";

describe("InMemoryEmailService", () => {
  it("records a sent verification email, retrievable by recipient", async () => {
    const service = new InMemoryEmailService();

    await service.sendVerificationEmail({
      to: "user@example.com",
      verificationUrl: "https://app.example.com/verify-email?token=abc",
    });

    const found = service.findLastSentTo("user@example.com");
    expect(found?.kind).toBe("verification");
    expect(found?.url).toBe("https://app.example.com/verify-email?token=abc");
  });

  it("records a sent password-reset email", async () => {
    const service = new InMemoryEmailService();

    await service.sendPasswordResetEmail({
      to: "user@example.com",
      resetUrl: "https://app.example.com/reset-password?token=xyz",
    });

    const found = service.findLastSentTo("user@example.com");
    expect(found?.kind).toBe("password-reset");
    expect(found?.url).toBe("https://app.example.com/reset-password?token=xyz");
  });

  it("does not send anything over the network — never rejects, never requires configuration", async () => {
    const service = new InMemoryEmailService();

    await expect(
      service.sendVerificationEmail({ to: "user@example.com", verificationUrl: "https://x/y" }),
    ).resolves.toBeUndefined();
  });

  it("returns undefined for a recipient nothing was sent to", () => {
    const service = new InMemoryEmailService();

    expect(service.findLastSentTo("nobody@example.com")).toBeUndefined();
  });

  it("returns the most recently sent message for a recipient with multiple sends", async () => {
    const service = new InMemoryEmailService();
    await service.sendVerificationEmail({ to: "user@example.com", verificationUrl: "https://x/1" });
    await service.sendPasswordResetEmail({ to: "user@example.com", resetUrl: "https://x/2" });

    expect(service.findLastSentTo("user@example.com")?.url).toBe("https://x/2");
  });
});
