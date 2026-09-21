import type { ContentId } from "../content/content-id.js";
import type { ContentType } from "../content/content-type.js";

/**
 * A lesson is not a second kind of record: it is a content item whose `type`
 * is `lesson` (ADR-018 fixed that model in M5). Its identity is therefore its
 * `ContentId` — stable, language-prefixed, permanent — and the language, level,
 * status, order, title, description and blocks all stay where M5 put them.
 * Nothing about a lesson is copied anywhere else, and nothing about it is
 * specific to a language.
 */
export type LessonId = ContentId;

export function isLesson<T extends { type: ContentType }>(item: T): item is T & { type: "lesson" } {
  return item.type === "lesson";
}
