/**
 * Content lifecycle. Only `published` content is ever shown to students;
 * `draft` is content being written and `archived` is content withdrawn but
 * kept in the repository history.
 */
export const CONTENT_STATUSES = ["draft", "published", "archived"] as const;
export type ContentStatus = (typeof CONTENT_STATUSES)[number];

export function isValidContentStatus(value: string): value is ContentStatus {
  return CONTENT_STATUSES.some((status) => status === value);
}

export function isPublished(item: { status: ContentStatus }): boolean {
  return item.status === "published";
}
