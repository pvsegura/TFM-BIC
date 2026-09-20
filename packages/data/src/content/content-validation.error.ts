/** One problem found while loading the content tree. `location` is a path
 * relative to the content root (posix separators), or `catalog` for a rule
 * that spans several files. */
export interface ContentIssue {
  location: string;
  message: string;
}

/** Thrown at startup when the content on disk is malformed or inconsistent —
 * the server refuses to start rather than serve broken content. */
export class ContentValidationError extends Error {
  constructor(public readonly issues: readonly ContentIssue[]) {
    super(
      `Content is invalid (${String(issues.length)} problem${issues.length === 1 ? "" : "s"}):\n` +
        issues.map((issue) => `  - ${issue.location}: ${issue.message}`).join("\n"),
    );
    this.name = "ContentValidationError";
  }
}
