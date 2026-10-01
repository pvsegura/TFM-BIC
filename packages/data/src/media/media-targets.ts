import {
  ContentLanguage,
  InvalidVideoPlanError,
  buildLessonVideoScript,
  buildVocabularyVideoScript,
  findVocabularyExample,
  type MediaTarget,
  type VocabularyVisual,
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
  label: string;
}

/** Content the plan wants a video for, but which cannot get a good one yet — never filled in. */
export interface BlockedTarget {
  key: string;
  label: string;
  reason: string;
}

/**
 * Turns the content catalog and a language's media plan into pedagogical video targets (M22).
 * Only published content; a lesson needs an authored plan and a word needs a visual context —
 * otherwise it is reported as blocked with the reason, and no filler video is made. Plans are
 * validated against the content (every target-language line must be course content).
 */
export async function planMediaTargets(
  repos: ContentRepositories,
  plan: MediaPlan,
  filter: TargetFilter,
): Promise<{ targets: PlannedTarget[]; blocked: BlockedTarget[] }> {
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
  const vocabulary = (await repos.vocabularyRepository.listItems(languageId)).filter(
    (i) => i.status === "published",
  );
  const phonetics = (await repos.phoneticRepository.listRepresentations(languageId)).filter(
    (p) => p.status === "published",
  );
  const contentLanguage = new ContentLanguage(language.locale, { lessons, vocabulary, phonetics });

  const targets: PlannedTarget[] = [];
  const blocked: BlockedTarget[] = [];
  const wanted = (key: string, priority: number) =>
    filter.only ? filter.only.includes(key) : priority <= filter.maxPriority;
  const attempt = (key: string, label: string, priority: number, build: () => PlannedTarget) => {
    try {
      targets.push(build());
    } catch (error) {
      if (!(error instanceof InvalidVideoPlanError)) throw error;
      blocked.push({ key, label, reason: error.problems.join(" | ") });
    }
    void priority;
  };

  if (filter.kinds.lessons || filter.only) {
    for (const entry of plan.plan.lessons) {
      const key = `lesson:${entry.contentId}`;
      if (!wanted(key, entry.priority)) continue;
      const lesson = lessons.find((l) => l.id === entry.contentId);
      if (!lesson)
        throw new Error(`plan.json names ${entry.contentId}, which is not published content.`);
      const lessonPlan = plan.lessonPlans.get(lesson.id);
      if (!lessonPlan) {
        blocked.push({
          key,
          label: lesson.title,
          reason: `no video plan (media/lessons/${lesson.id}.json)`,
        });
        continue;
      }
      attempt(key, lesson.title, entry.priority, () => ({
        key,
        priority: entry.priority,
        label: lesson.title,
        outputDir: `${languageId}/lesson/${lesson.id}`,
        script: buildLessonVideoScript({
          lesson,
          plan: lessonPlan,
          language: contentLanguage,
          phonetics,
        }),
        pronunciations: [],
      }));
    }
  }

  if (filter.kinds.vocabulary || filter.only) {
    const categories = await repos.vocabularyRepository.listCategories(languageId);
    for (const category of [...categories].sort((a, b) => a.order - b.order)) {
      const entry = plan.plan.vocabularyCategories.find((c) => c.categoryId === category.id);
      if (!entry) continue;
      if (filter.category && filter.category !== category.id) continue;
      for (const item of vocabulary
        .filter((i) => i.categoryId === category.id)
        .sort((a, b) => a.order - b.order)) {
        const key = `vocabulary-item:${item.id}`;
        if (!wanted(key, entry.priority)) continue;
        const label = `${item.lemma} (${category.title})`;
        const visual = plan.plan.vocabulary[item.id] as VocabularyVisual | undefined;
        if (!visual) {
          blocked.push({ key, label, reason: "no visual context in plan.json (vocabulary)" });
          continue;
        }
        const example = findVocabularyExample(item, lessons, language.locale);
        attempt(key, label, entry.priority, () => ({
          key,
          priority: entry.priority,
          label,
          outputDir: `${languageId}/vocabulary/${item.id}`,
          script: buildVocabularyVideoScript({
            item,
            category,
            plan: { categoryId: category.id, narrator: entry.narrator, cast: entry.cast },
            visual,
            language: contentLanguage,
            example,
          }),
          // The word as its character says it in the video — the same clip, reused on the page.
          pronunciations: [
            {
              purpose: "pronunciation",
              text: item.lemma,
              language: item.languageId,
              speaker: visual.actor,
            },
            ...(example
              ? [
                  {
                    purpose: "example-pronunciation" as const,
                    text: example.text,
                    language: item.languageId,
                    speaker: visual.actor,
                  },
                ]
              : []),
          ],
        }));
      }
    }
  }

  if (filter.only) {
    const found = new Set([...targets.map((t) => t.key), ...blocked.map((b) => b.key)]);
    const missing = filter.only.filter((k) => !found.has(k));
    if (missing.length)
      throw new Error(`Not in the media plan or not published: ${missing.join(", ")}`);
  }
  return { targets, blocked };
}
