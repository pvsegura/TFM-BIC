/** An operator command named an email that has no account. Operator-facing only — never an HTTP response. */
export class TeachingUserNotFoundError extends Error {
  constructor(which: "teacher" | "student" | "user") {
    super(`No ${which} account has that email.`);
    this.name = "TeachingUserNotFoundError";
  }
}
