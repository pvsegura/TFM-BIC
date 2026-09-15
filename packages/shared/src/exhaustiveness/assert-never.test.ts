import { describe, expect, it } from "vitest";

import { assertNever } from "./assert-never.js";

describe("assertNever", () => {
  it("throws when reached at runtime (a statically-unreachable branch was hit)", () => {
    // Intentionally cast past the `never` type — this simulates a union
    // member that wasn't handled in a switch/if-else chain, which is
    // exactly the bug this helper is meant to catch at compile time.
    expect(() => assertNever("unexpected-value" as never)).toThrow(/Unhandled case/);
  });
});
