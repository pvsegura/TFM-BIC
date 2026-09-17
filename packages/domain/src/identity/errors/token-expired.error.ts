export class TokenExpiredError extends Error {
  constructor() {
    super("This link has expired.");
    this.name = "TokenExpiredError";
  }
}
