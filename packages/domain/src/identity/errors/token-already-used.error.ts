export class TokenAlreadyUsedError extends Error {
  constructor() {
    super("This link has already been used.");
    this.name = "TokenAlreadyUsedError";
  }
}
