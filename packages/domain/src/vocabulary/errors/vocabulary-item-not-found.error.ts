/** No visible vocabulary item has this id. Does not reveal whether a draft, archived or hidden entry exists under it. */
export class VocabularyItemNotFoundError extends Error {
  constructor(vocabularyItemId: string) {
    super(`Vocabulary item "${vocabularyItemId}" was not found.`);
    this.name = "VocabularyItemNotFoundError";
  }
}
