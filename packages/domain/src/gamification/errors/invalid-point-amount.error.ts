export class InvalidPointAmountError extends Error {
  constructor(value: unknown) {
    super(
      `"${String(value)}" is not a valid point amount (expected a whole number of at least 1).`,
    );
    this.name = "InvalidPointAmountError";
  }
}
