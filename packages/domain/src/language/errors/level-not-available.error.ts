/** The language exists, but does not offer this level as a learning option (not declared, or only planned). */
export class LevelNotAvailableError extends Error {
  constructor(languageId: string, levelId: string) {
    super(`Level "${levelId}" is not available for language "${languageId}".`);
    this.name = "LevelNotAvailableError";
  }
}
