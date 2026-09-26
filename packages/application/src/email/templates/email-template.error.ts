/**
 * A template variable failed validation (a link outside the app, a header-injecting subject, an
 * empty newsletter). Always a caller bug or bad operator input — never shown to end users.
 */
export class EmailTemplateError extends Error {
  constructor(reason: string) {
    super(`Invalid email template input: ${reason}.`);
    this.name = "EmailTemplateError";
  }
}
