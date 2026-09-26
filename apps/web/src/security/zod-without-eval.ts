import { z } from "zod";

/**
 * Zod 4 probes whether `new Function` is allowed the first time it parses an object. Under the
 * SPA's Content-Security-Policy (no 'unsafe-eval', M16) the probe throws — Zod catches it and falls
 * back — but the browser still reports a `securitypolicyviolation`. `jitless` skips the probe and
 * the code generation (Zod's documented option for CSP environments). Imported first by main.tsx,
 * before any schema parses.
 */
z.config({ jitless: true });
