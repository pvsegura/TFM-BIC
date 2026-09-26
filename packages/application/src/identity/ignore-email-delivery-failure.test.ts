import { describe, expect, it } from "vitest";

import { EmailDeliveryError } from "../email/email-delivery.error.js";
import { ignoreEmailDeliveryFailure } from "./ignore-email-delivery-failure.js";

describe("ignoreEmailDeliveryFailure", () => {
  it("absorbs a provider delivery failure", async () => {
    await expect(
      ignoreEmailDeliveryFailure(() => Promise.reject(new EmailDeliveryError())),
    ).resolves.toBeUndefined();
  });

  it("rethrows anything else (e.g. an invalid template or a bug)", async () => {
    await expect(
      ignoreEmailDeliveryFailure(() => Promise.reject(new Error("not a delivery failure"))),
    ).rejects.toThrow("not a delivery failure");
  });
});
