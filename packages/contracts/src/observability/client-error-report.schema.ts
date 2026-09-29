import { z } from "zod";

/**
 * POST /client-errors (M18, ADR-029): what the SPA reports when it hits an error it could not
 * handle. Deliberately tiny and closed: the kind of failure, the error's class name and the page's
 * path — **no message, stack, query string, form value or user id**, which could carry personal
 * data or a token. The characters allowed make log injection impossible.
 */
export const clientErrorReportSchema = z.strictObject({
  kind: z.enum(["render", "uncaught", "unhandled_rejection"]),
  name: z.string().regex(/^[A-Za-z_$][A-Za-z0-9_$.]{0,63}$/),
  path: z.string().regex(/^\/[A-Za-z0-9\-._~/:%@!$&'()*+,;=]{0,199}$/),
});

export type ClientErrorReport = z.infer<typeof clientErrorReportSchema>;
