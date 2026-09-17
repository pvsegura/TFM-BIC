import { describe, expect, it } from "vitest";

import type { User } from "./user.js";
import { toSafeUser } from "./user.js";

const baseUser: User = {
  id: "11111111-1111-4111-8111-111111111111",
  email: "user@example.com",
  normalizedEmail: "user@example.com",
  passwordHash: "$argon2id$v=19$m=65536,t=3,p=4$somesaltsomesalt$somehashsomehash",
  role: "STUDENT",
  emailVerified: false,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
};

describe("toSafeUser", () => {
  it("includes only id, email, role, and emailVerified", () => {
    expect(toSafeUser(baseUser)).toEqual({
      id: baseUser.id,
      email: baseUser.email,
      role: baseUser.role,
      emailVerified: baseUser.emailVerified,
    });
  });

  it("never includes the password hash", () => {
    const safe = toSafeUser(baseUser);
    expect(safe).not.toHaveProperty("passwordHash");
    expect(JSON.stringify(safe)).not.toContain("argon2id");
  });

  it("never includes normalizedEmail, createdAt, or updatedAt", () => {
    const safe = toSafeUser(baseUser);
    expect(safe).not.toHaveProperty("normalizedEmail");
    expect(safe).not.toHaveProperty("createdAt");
    expect(safe).not.toHaveProperty("updatedAt");
  });
});
