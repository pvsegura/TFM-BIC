import {
  createContentId,
  createVocabularyItemId,
  getLevel,
  isLevelSelectable,
  type LanguageId,
  type LevelId,
} from "@tfm-bic/domain";

import type { ContentRepository } from "../content/ports/content-repository.js";
import type { GetLessonUseCase } from "../lesson/use-cases/get-lesson.use-case.js";
import type { GetVocabularyItemUseCase } from "../vocabulary/use-cases/get-vocabulary-item.use-case.js";
import type { LearnerInsightsReadModel } from "./ports/learner-insights-read-model.js";

/**
 * Turns "who is asking, and from which page" into the small, authorised context block the coach is
 * given (M23, ADR-034).
 *
 * This is in the application layer, not the route, for two reasons:
 *
 * - **The CEFR level is derived, never accepted.** The brief is explicit that a learner's claimed
 *   level must not be trusted when the application has its own answer. There is no level column on
 *   an account, so the level is derived from what the learner has actually worked on: the highest
 *   level among their recent lesson activity, falling back to the lowest level the language offers.
 *   That is a business rule, and it lives here.
 * - **A context id is re-authorised, never echoed.** The client says "I am on lesson pl-greetings";
 *   this resolves that id through the *same* use case the lesson page uses, so a lesson the learner
 *   may not open becomes a plain "no context" rather than a title leaking into the conversation.
 */

/** What the client may say it is showing. Ids only — resolved and authorised here. */
export type CoachContextInput =
  | { readonly type: "lesson"; readonly lessonId: string }
  | { readonly type: "exercise"; readonly exerciseId: string }
  | { readonly type: "vocabulary-item"; readonly vocabularyItemId: string }
  | { readonly type: "video"; readonly lessonId: string }
  | { readonly type: "phonetic"; readonly phoneticId: string };

export interface ResolvedCoachContext {
  readonly levelId: LevelId | undefined;
  readonly context: readonly { readonly label: string; readonly value: string }[];
}

export interface CoachContextDependencies {
  readonly contentRepository: ContentRepository;
  readonly insights: LearnerInsightsReadModel;
  readonly getLesson: GetLessonUseCase;
  readonly getVocabularyItem: GetVocabularyItemUseCase;
}

/** Recent events inspected when deriving a level. Bounded: this runs on every coaching turn. */
const ACTIVITY_SAMPLE = 8;

/**
 * The level the learner is working at, from their own records.
 *
 * Highest, not most recent: someone revisiting an A1 lesson while working through A2 should still
 * be spoken to at A2. Returns `undefined` when there is nothing to go on *and* the language offers
 * no selectable level — the coach is then told the level is unknown and instructed not to guess,
 * which is better than inventing A1 for an advanced learner.
 */
async function deriveLevel(
  deps: CoachContextDependencies,
  userId: string,
  languageId: LanguageId,
): Promise<LevelId | undefined> {
  const activity = await deps.insights.loadRecentActivity(userId, ACTIVITY_SAMPLE);
  let best: LevelId | undefined;
  for (const event of activity) {
    let levelId: LevelId | undefined;
    try {
      const item = await deps.contentRepository.findContent(createContentId(event.contentId));
      levelId = item?.languageId === languageId ? item.levelId : undefined;
    } catch {
      // An id that is no longer valid content: it simply contributes nothing.
      continue;
    }
    if (levelId && (!best || getLevel(levelId).rank > getLevel(best).rank)) {
      best = levelId;
    }
  }
  if (best) return best;

  // Nothing worked on yet: the first level the language actually offers, which is where the
  // learner would start. Never a hard-coded "a1" — a language may begin elsewhere.
  const levels = await deps.contentRepository.listLanguageLevels(languageId);
  const selectable = levels
    .filter((level) => isLevelSelectable(level))
    .map((level) => level.levelId)
    .sort((a, b) => getLevel(a).rank - getLevel(b).rank);
  return selectable[0];
}

/**
 * The context block, from the page the learner opened the coach on. Each branch goes through the
 * authorising use case and contributes nothing if that refuses; a `video` is a lesson plus a note,
 * since the transcript itself comes from a tool.
 */
async function describeContext(
  deps: CoachContextDependencies,
  userId: string,
  input: CoachContextInput,
): Promise<readonly { label: string; value: string }[]> {
  try {
    switch (input.type) {
      case "lesson":
      case "video": {
        const detail = await deps.getLesson.execute({
          userId,
          lessonId: createContentId(input.lessonId),
        });
        const entries = [
          {
            label: "Lesson the learner has open",
            value: `${detail.lesson.title} (id: ${detail.lesson.id})`,
          },
          { label: "Their progress in it", value: detail.progress.status },
        ];
        return input.type === "video"
          ? [...entries, { label: "They are watching this lesson's video", value: "yes" }]
          : entries;
      }
      case "vocabulary-item": {
        const detail = await deps.getVocabularyItem.execute({
          userId,
          vocabularyItemId: createVocabularyItemId(input.vocabularyItemId),
        });
        return [
          {
            label: "Vocabulary entry the learner has open",
            value: `"${detail.item.lemma}" — ${detail.item.translation} (id: ${detail.item.id})`,
          },
          { label: "Their status for it", value: detail.userState.status },
        ];
      }
      case "exercise":
        // Only the id, and only as something to look up: whether the learner may see this exercise
        // — and whether its answer may be shown — is decided by `get_exercise_context`, which
        // checks visibility and their attempt history. Resolving a title here would duplicate that.
        return [
          {
            label: "Exercise the learner is asking about",
            value: `id: ${input.exerciseId} — call get_exercise_context for it`,
          },
        ];
      case "phonetic":
        return [
          {
            label: "Pronunciation entry the learner has open",
            value: `id: ${input.phoneticId} — call get_phonetic_information for it`,
          },
        ];
    }
  } catch {
    // Not visible, not found, or not this learner's to see: the coach simply gets no page context.
    return [];
  }
}

export async function resolveCoachContext(
  deps: CoachContextDependencies,
  input: {
    readonly userId: string;
    readonly languageId: LanguageId;
    readonly context: CoachContextInput | undefined;
  },
): Promise<ResolvedCoachContext> {
  const levelId = await deriveLevel(deps, input.userId, input.languageId);
  const language = await deps.contentRepository.findLanguage(input.languageId);
  const pageContext = input.context ? await describeContext(deps, input.userId, input.context) : [];

  return {
    levelId,
    context: [
      {
        label: "Target language (what they are learning)",
        value: language?.name ?? input.languageId,
      },
      {
        label: "CEFR level in this application",
        value: levelId ? getLevel(levelId).label : "unknown — do not guess one",
      },
      ...pageContext,
    ],
  };
}
