export class InvalidPhoneticRepresentationIdError extends Error {
  constructor(value: string) {
    super(
      `"${value}" is not a valid phoneticRepresentationId (expected lowercase letters, digits and single hyphens, starting with a letter, at most 64 characters).`,
    );
    this.name = "InvalidPhoneticRepresentationIdError";
  }
}
