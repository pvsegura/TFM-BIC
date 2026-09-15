export class InvalidLanguageIdError extends Error {
  constructor(value: string) {
    super(
      `"${value}" is not a valid languageId (expected a lowercase ISO 639-1/639-2 code, e.g. "pl").`,
    );
    this.name = "InvalidLanguageIdError";
  }
}
