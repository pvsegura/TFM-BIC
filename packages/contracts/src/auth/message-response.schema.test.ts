import { describe, expect, it } from "vitest";

import { messageResponseSchema } from "./message-response.schema.js";

describe("messageResponseSchema", () => {
  it("accepts a message string", () => {
    expect(messageResponseSchema.safeParse({ message: "ok" }).success).toBe(true);
  });

  it("rejects a missing message", () => {
    expect(messageResponseSchema.safeParse({}).success).toBe(false);
  });
});
