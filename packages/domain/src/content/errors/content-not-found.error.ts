/** No published content has this id. Does not reveal whether an unpublished item exists under it. */
export class ContentNotFoundError extends Error {
  constructor(contentId: string) {
    super(`Content "${contentId}" was not found.`);
    this.name = "ContentNotFoundError";
  }
}
