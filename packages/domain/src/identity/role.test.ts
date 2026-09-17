import { describe, expect, it } from "vitest";

import { isValidRole, ROLES } from "./role.js";

describe("ROLES", () => {
  it("includes exactly the M0/M3 roles, STUDENT and TEACHER", () => {
    expect(ROLES).toEqual(["STUDENT", "TEACHER"]);
  });
});

describe("isValidRole", () => {
  it.each(ROLES)("accepts %s", (role) => {
    expect(isValidRole(role)).toBe(true);
  });

  it("rejects a role reserved for a future milestone (ADMIN)", () => {
    expect(isValidRole("ADMIN")).toBe(false);
  });

  it("rejects an arbitrary string", () => {
    expect(isValidRole("not-a-role")).toBe(false);
  });

  it("rejects a self-assigned privileged role spelled in lowercase", () => {
    expect(isValidRole("teacher")).toBe(false);
  });
});
