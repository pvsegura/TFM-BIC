import { describe, expect, it } from "vitest";

import {
  createPassword,
  isValidPassword,
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
} from "./password.js";
import { WeakPasswordError } from "./errors/weak-password.error.js";

describe("isValidPassword", () => {
  it(`accepts a password of exactly the minimum length (${MIN_PASSWORD_LENGTH})`, () => {
    expect(isValidPassword("a".repeat(MIN_PASSWORD_LENGTH))).toBe(true);
  });

  it("accepts an ordinary passphrase with no forced complexity", () => {
    expect(isValidPassword("correct horse battery staple")).toBe(true);
  });

  it("rejects a password shorter than the minimum", () => {
    expect(isValidPassword("a".repeat(MIN_PASSWORD_LENGTH - 1))).toBe(false);
  });

  it(`rejects a password longer than the maximum (${MAX_PASSWORD_LENGTH})`, () => {
    expect(isValidPassword("a".repeat(MAX_PASSWORD_LENGTH + 1))).toBe(false);
  });

  it("accepts a password of exactly the maximum length", () => {
    expect(isValidPassword("a".repeat(MAX_PASSWORD_LENGTH))).toBe(true);
  });

  it("rejects an empty password", () => {
    expect(isValidPassword("")).toBe(false);
  });

  it("does not require uppercase/symbol/digit complexity", () => {
    expect(isValidPassword("alllowercaseletters")).toBe(true);
  });
});

describe("createPassword", () => {
  it("returns the password unchanged when valid", () => {
    expect(createPassword("a-reasonable-passphrase")).toBe("a-reasonable-passphrase");
  });

  it("throws WeakPasswordError when too short", () => {
    expect(() => createPassword("short")).toThrow(WeakPasswordError);
  });

  it("does not leak the raw password in the error message", () => {
    try {
      createPassword("short");
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(WeakPasswordError);
      expect((error as Error).message).not.toContain("short");
    }
  });
});
