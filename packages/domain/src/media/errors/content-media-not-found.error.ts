/**
 * No visible content of this type has this id, so it has no media to show. Does not reveal
 * whether an unpublished item, or one in an inactive language or unavailable level, exists.
 */
export class ContentMediaNotFoundError extends Error {
  constructor(contentType: string, contentId: string) {
    super(`No visible ${contentType} "${contentId}" has media.`);
    this.name = "ContentMediaNotFoundError";
  }
}
