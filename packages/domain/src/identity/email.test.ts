import { describe, expect, it } from "vitest";

import { createEmail, isValidEmail, normalizeEmail } from "./email.js";
import { InvalidEmailError } from "./errors/invalid-email.error.js";

describe("normalizeEmail", () => {
  it("trims surrounding whitespace", () => {
    expect(normalizeEmail("  user@example.com  ")).toBe("user@example.com");
  });

  it("lowercases the whole address", () => {
    expect(normalizeEmail("User@Example.COM")).toBe("user@example.com");
  });

  it("trims and lowercases together", () => {
    expect(normalizeEmail("  Mixed.Case@Example.Com ")).toBe("mixed.case@example.com");
  });
});

describe("isValidEmail", () => {
  it("accepts a well-formed address", () => {
    expect(isValidEmail("user@example.com")).toBe(true);
  });

  it("rejects a string with no @", () => {
    expect(isValidEmail("not-an-email")).toBe(false);
  });

  it("rejects a string with no domain", () => {
    expect(isValidEmail("user@")).toBe(false);
  });

  it("rejects a string with no local part", () => {
    expect(isValidEmail("@example.com")).toBe(false);
  });

  it("rejects an empty string", () => {
    expect(isValidEmail("")).toBe(false);
  });

  it("rejects a value with an embedded newline (header-injection guard)", () => {
    expect(isValidEmail("user@example.com\nBcc: attacker@evil.com")).toBe(false);
  });

  it("rejects an excessively long address", () => {
    const local = "a".repeat(250);
    expect(isValidEmail(`${local}@example.com`)).toBe(false);
  });
});

describe("createEmail", () => {
  it("returns the normalized address for a valid input", () => {
    expect(createEmail("  User@Example.com ")).toBe("user@example.com");
  });

  it("throws InvalidEmailError for an invalid address", () => {
    expect(() => createEmail("not-an-email")).toThrow(InvalidEmailError);
  });

  it("does not leak the raw input in the error for an invalid address", () => {
    try {
      createEmail("not-an-email");
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(InvalidEmailError);
      expect((error as Error).message).not.toContain("not-an-email");
    }
  });
});
