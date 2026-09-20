/** No active language has this id. Deliberately does not say whether it is unknown or switched off. */
export class LanguageNotFoundError extends Error {
  constructor(languageId: string) {
    super(`Language "${languageId}" was not found.`);
    this.name = "LanguageNotFoundError";
  }
}
