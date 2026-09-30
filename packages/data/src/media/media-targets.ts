import {
  buildLessonVideoScript,
  buildVocabularyVideoScript,
  findVocabularyExample,
  type MediaTarget,
} from "@tfm-bic/application";
import type { ContentItem, LanguageId } from "@tfm-bic/domain";

import type { ContentRepositories } from "../content/load-content-repositories.js";
import type { MediaPlan } from "./media-plan.js";

export interface TargetFilter {
  /** Explicit `type:id` keys, e.g. `lesson:pl-greetings`, `vocabulary-item:pl-dom`. */
  only?: string[] | undefined;
  kinds: { lessons: boolean; vocabulary: boolean };
  /** Include plan entries up to this priority (1 = most important). */
  maxPriority: number;
  category?: string | undefined;
}

export interface PlannedTarget extends MediaTarget {
  key: string;
  priority: number;
  /** For reporting: what the script was built from. */
  label: string;
}

/**
 * Turns the content catalog and a language's media plan into pipeline targets (M21). Only
 * published content is ever a target; the plan decides narrator and priority. Order: lessons in
 * catalog order, then vocabulary by category order and item order — so a small batch always does
 * the most important items first.
 */
export async function planMediaTargets(
  repos: ContentRepositories,
  plan: MediaPlan,
  filter: TargetFilter,
): Promise<PlannedTarget[]> {
  const languageId = plan.languageId as LanguageId;
  const language = await repos.contentRepository.findLanguage(languageId);
  if (!language) throw new Error(`Unknown language ${languageId}`);
  const levels = await repos.contentRepository.listLanguageLevels(languageId);
  const lessons: ContentItem[] = [];
  for (const level of levels) {
    lessons.push(
      ...(await repos.contentRepository.listContent(languageId, level.levelId)).filter(
        (c) => c.status === "published",
      ),
    );
  }

  const targets: PlannedTarget[] = [];
  const wanted = (key: string, priority: number) =>
    filter.only ? filter.only.includes(key) : priority <= filter.maxPriority;

  if (filter.kinds.lessons || filter.only) {
    for (const entry of plan.plan.lessons) {
      const key = `lesson:${entry.contentId}`;
      if (!wanted(key, entry.priority)) continue;
      const lesson = lessons.find((l) => l.id === entry.contentId);
      if (!lesson)
        throw new Error(`plan.json names ${entry.contentId}, which is not published content.`);
      const exercises = await repos.exerciseRepository.listByLesson(lesson.id);
      targets.push({
        key,
        priority: entry.priority,
        label: lesson.title,
        outputDir: `${languageId}/lesson/${lesson.id}`,
        script: buildLessonVideoScript({
          lesson,
          narratorId: entry.narratorId,
          levelLabel: lesson.levelId.toUpperCase(),
          exerciseCount: exercises.length,
        }),
        pronunciations: [],
      });
    }
  }

  if (filter.kinds.vocabulary || filter.only) {
    const categories = await repos.vocabularyRepository.listCategories(languageId);
    const items = (await repos.vocabularyRepository.listItems(languageId)).filter(
      (i) => i.status === "published",
    );
    for (const category of [...categories].sort((a, b) => a.order - b.order)) {
      const entry = plan.plan.vocabularyCategories.find((c) => c.categoryId === category.id);
      if (!entry) continue;
      if (filter.category && filter.category !== category.id) continue;
      for (const item of items
        .filter((i) => i.categoryId === category.id)
        .sort((a, b) => a.order - b.order)) {
        const key = `vocabulary-item:${item.id}`;
        if (!wanted(key, entry.priority)) continue;
        const example = findVocabularyExample(item, lessons, language.locale);
        const pictogram = plan.plan.vocabularyPictograms[item.id];
        targets.push({
          key,
          priority: entry.priority,
          label: `${item.lemma} (${category.title})`,
          outputDir: `${languageId}/vocabulary/${item.id}`,
          script: buildVocabularyVideoScript({
            item,
            category,
            narratorId: entry.narratorId,
            locale: language.locale,
            example,
            pictogram,
          }),
          // The word's own clip is the one its video says; the page reuses it (same key).
          pronunciations: [
            { purpose: "pronunciation", text: item.lemma, language: item.languageId },
            ...(example
              ? [
                  {
                    purpose: "example-pronunciation" as const,
                    text: example.text,
                    language: item.languageId,
                  },
                ]
              : []),
          ],
        });
      }
    }
  }

  if (filter.only) {
    const found = new Set(targets.map((t) => t.key));
    const missing = filter.only.filter((k) => !found.has(k));
    if (missing.length)
      throw new Error(`Not in the media plan or not published: ${missing.join(", ")}`);
  }
  return targets;
}
