import { z } from "zod";
import { describe, expect, it } from "vitest";

import "./zod-without-eval.js";

describe("Zod configured for a CSP without 'unsafe-eval' (M16)", () => {
  it("runs Zod jitless, so it never probes `new Function` (a CSP violation even when caught)", () => {
    expect(z.config().jitless).toBe(true);
  });

  it("still validates", () => {
    const schema = z.object({ a: z.string() }).strict();
    expect(schema.safeParse({ a: "x" }).success).toBe(true);
    expect(schema.safeParse({ a: 1 }).success).toBe(false);
  });
});
