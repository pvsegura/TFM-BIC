export class InvalidPointTransactionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidPointTransactionError";
  }
}
