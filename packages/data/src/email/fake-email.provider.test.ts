import { EmailDeliveryError, type OutgoingEmail } from "@tfm-bic/application";
import { describe, expect, it } from "vitest";

import { FakeEmailProvider } from "./fake-email.provider.js";

function message(overrides: Partial<OutgoingEmail> = {}): OutgoingEmail {
  return {
    to: "ada@example.com",
    from: "TFM-BIC <no-reply@example.com>",
    replyTo: null,
    subject: "Verify your email address",
    html: '<p><a href="https://app.example.com/verify-email?token=abc">Verify</a></p>',
    text: "Verify email address: https://app.example.com/verify-email?token=abc\n\nIgnore otherwise.",
    category: "transactional",
    template: "email-verification",
    listUnsubscribeUrl: null,
    ...overrides,
  };
}

describe("FakeEmailProvider", () => {
  it("captures every accepted message without any network access", async () => {
    const provider = new FakeEmailProvider();

    await provider.send(message());

    expect(provider.name).toBe("fake");
    expect(provider.all()).toHaveLength(1);
    expect(provider.all()[0]).toMatchObject({
      to: "ada@example.com",
      template: "email-verification",
    });
  });

  it("finds the latest message to a recipient, case-insensitively, optionally by template", async () => {
    const provider = new FakeEmailProvider();
    await provider.send(message({ subject: "first" }));
    await provider.send(message({ to: "other@example.com" }));
    await provider.send(
      message({ subject: "reset", template: "password-reset", to: "Ada@Example.com" }),
    );

    expect(provider.findLastSentTo("ada@example.com")?.subject).toBe("reset");
    expect(provider.findLastSentTo("ada@example.com", "email-verification")?.subject).toBe("first");
    expect(provider.findLastSentTo("nobody@example.com")).toBeUndefined();
  });

  it("extracts the links from the text part, in order", async () => {
    const provider = new FakeEmailProvider();
    await provider.send(
      message({
        text: "Go: https://app.example.com/a?token=1\nUnsubscribe: https://app.example.com/u?token=2",
      }),
    );

    expect(provider.findLastSentTo("ada@example.com")?.links).toEqual([
      "https://app.example.com/a?token=1",
      "https://app.example.com/u?token=2",
    ]);
  });

  it("can simulate an unavailable provider for the next sends", async () => {
    const provider = new FakeEmailProvider();
    provider.failNext(1);

    await expect(provider.send(message())).rejects.toBeInstanceOf(EmailDeliveryError);
    await expect(provider.send(message())).resolves.toBeUndefined();
    expect(provider.all()).toHaveLength(1);
  });

  it("keeps only the most recent messages, so a long-running dev server cannot grow without bound", async () => {
    const provider = new FakeEmailProvider({ capacity: 2 });
    await provider.send(message({ subject: "1" }));
    await provider.send(message({ subject: "2" }));
    await provider.send(message({ subject: "3" }));

    expect(provider.all().map((m) => m.subject)).toEqual(["2", "3"]);
  });

  it("clears everything", async () => {
    const provider = new FakeEmailProvider();
    await provider.send(message());
    provider.clear();
    expect(provider.all()).toEqual([]);
  });
});
