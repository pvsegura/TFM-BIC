import { describe, expect, it } from "vitest";

import { InvalidUserDataRegisterError } from "./errors/invalid-user-data-register.error.js";
import { validateUserDataRegister, type UserDataRegisterEntry } from "./user-data-register.js";

const profile: UserDataRegisterEntry = {
  store: "student_profiles",
  context: "profile",
  userReferences: ["user_id"],
  classification: "PERSONAL",
  erasure: "delete",
};

const sessions: UserDataRegisterEntry = {
  store: "sessions",
  context: "identity",
  userReferences: ["user_id"],
  classification: "SECURITY_SENSITIVE",
  erasure: "delete",
};

describe("validateUserDataRegister", () => {
  it("accepts a register where every store is deleted", () => {
    expect(() => {
      validateUserDataRegister([profile, sessions]);
    }).not.toThrow();
  });

  it("refuses the same store listed twice", () => {
    expect(() => {
      validateUserDataRegister([profile, { ...profile }]);
    }).toThrow(InvalidUserDataRegisterError);
  });

  it("refuses a store with no user reference", () => {
    expect(() => {
      validateUserDataRegister([{ ...profile, userReferences: [] }]);
    }).toThrow(/no user reference/);
  });

  it.each(["retain", "anonymise"] as const)("refuses %s without a documented reason", (erasure) => {
    expect(() => {
      validateUserDataRegister([{ ...profile, erasure }]);
    }).toThrow(/documented reason/);
    expect(() => {
      validateUserDataRegister([{ ...profile, erasure, reason: "   " }]);
    }).toThrow(/documented reason/);
  });

  it("accepts retain or anonymise when a reason is documented", () => {
    expect(() => {
      validateUserDataRegister([{ ...profile, erasure: "retain", reason: "legal hold" }]);
    }).not.toThrow();
  });

  it("refuses an empty register", () => {
    expect(() => {
      validateUserDataRegister([]);
    }).toThrow(/empty/);
  });
});
