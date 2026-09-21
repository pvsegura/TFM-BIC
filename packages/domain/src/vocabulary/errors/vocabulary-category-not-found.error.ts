/** No visible category has this id in this language. Does not reveal whether a draft category exists under it. */
export class VocabularyCategoryNotFoundError extends Error {
  constructor(languageId: string, categoryId: string) {
    super(`Vocabulary category "${categoryId}" was not found in language "${languageId}".`);
    this.name = "VocabularyCategoryNotFoundError";
  }
}
