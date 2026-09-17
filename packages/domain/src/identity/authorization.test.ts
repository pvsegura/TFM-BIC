import { describe, expect, it } from "vitest";

import { ForbiddenError } from "./errors/forbidden.error.js";
import { requireRole } from "./authorization.js";

describe("requireRole", () => {
  it("does not throw when the role is in the allowed list", () => {
    expect(() => requireRole("TEACHER", ["TEACHER"])).not.toThrow();
  });

  it("does not throw when one of several allowed roles matches", () => {
    expect(() => requireRole("STUDENT", ["TEACHER", "STUDENT"])).not.toThrow();
  });

  it("throws ForbiddenError when the role is not allowed", () => {
    expect(() => requireRole("STUDENT", ["TEACHER"])).toThrow(ForbiddenError);
  });

  it("throws ForbiddenError when the allowed list is empty", () => {
    expect(() => requireRole("TEACHER", [])).toThrow(ForbiddenError);
  });
});
