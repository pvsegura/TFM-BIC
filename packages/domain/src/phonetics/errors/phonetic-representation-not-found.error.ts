/** No visible phonetic representation has this id. Does not reveal whether a draft, archived or hidden entry exists under it. */
export class PhoneticRepresentationNotFoundError extends Error {
  constructor(phoneticRepresentationId: string) {
    super(`Phonetic representation "${phoneticRepresentationId}" was not found.`);
    this.name = "PhoneticRepresentationNotFoundError";
  }
}
