import { Link } from "./app-link.js";

import { useVocabulary } from "../hooks/use-vocabulary.js";
import { useMediaIndex } from "../hooks/use-media.js";
import { WordAudioButton } from "./word-audio-button.js";

const enc = encodeURIComponent;

/**
 * "Words in this lesson" (M22): the vocabulary items the lesson's video teaches, each linking to its
 * own page and video — the lesson flows into word practice instead of ending. Nothing is shown when
 * the lesson names no words or the list cannot be loaded (the lesson stays usable).
 */
export function LessonWords({ languageId, ids }: { languageId: string; ids: string[] }) {
  const query = useVocabulary(ids.length > 0 ? languageId : undefined, { limit: 50 });
  const words = (query.data?.items ?? []).filter((item) => ids.includes(item.id));
  const media = useMediaIndex();
  if (words.length === 0) return null;
  return (
    <section aria-labelledby="lesson-words" className="mt-8">
      <h2 id="lesson-words" className="text-lg font-semibold">
        Words in this lesson
      </h2>
      <ul className="mt-3 grid gap-2 sm:grid-cols-2">
        {words.map((word) => (
          <li key={word.id}>
            <Link
              to={`/learn/vocabulary/${enc(word.id)}`}
              className="flex items-center justify-between gap-3 rounded-lg border border-primary/15 px-3 py-2 hover:border-accent dark:border-surface/15"
            >
              <span>
                <span lang={word.languageId} className="font-semibold">
                  {word.lemma}
                </span>{" "}
                <span className="text-sm text-primary/70 dark:text-surface/70">
                  {word.translation}
                </span>
              </span>
              <WordAudioButton
                url={media.data?.get(`vocabulary-item:${word.id}`)?.pronunciationUrl}
                word={word.lemma}
                lang={word.languageId}
              />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
