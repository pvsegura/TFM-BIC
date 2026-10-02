import { Link } from "./app-link.js";

import { useContentItem } from "../hooks/use-catalog.js";
import { useMediaIndex } from "../hooks/use-media.js";

const enc = encodeURIComponent;

/**
 * "See it in a lesson" on a word page (M22): the first lesson whose video teaches this word, so a
 * learner who met the word alone can watch it used in a conversation. Shows nothing when no lesson
 * teaches it (most words today) or while loading.
 */
export function RelatedLesson({ vocabularyId }: { vocabularyId: string }) {
  const index = useMediaIndex();
  const entry = index.data
    ? [...index.data.values()].find(
        (item) => item.contentType === "lesson" && item.targetVocabularyIds.includes(vocabularyId),
      )
    : undefined;
  const lesson = useContentItem(entry?.contentId);
  if (!entry || !lesson.data) return null;
  const item = lesson.data;
  const href =
    item.type === "lesson"
      ? `/learn/lessons/${enc(item.id)}`
      : `/learn/${enc(item.languageId)}/${enc(item.levelId)}/${enc(item.id)}`;
  return (
    <Link to={href} className="font-medium underline underline-offset-2">
      See it in a lesson: {item.title} →
    </Link>
  );
}
