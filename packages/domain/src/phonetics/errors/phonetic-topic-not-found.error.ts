/** No visible phonetic topic has this id in this language. */
export class PhoneticTopicNotFoundError extends Error {
  constructor(languageId: string, phoneticTopicId: string) {
    super(`Phonetic topic "${phoneticTopicId}" was not found in language "${languageId}".`);
    this.name = "PhoneticTopicNotFoundError";
  }
}
