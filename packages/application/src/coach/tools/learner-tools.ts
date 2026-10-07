import { contentIdBelongsToLanguage, createContentId, createLanguageId } from "@tfm-bic/domain";

import type { ContentRepository } from "../../content/ports/content-repository.js";
import type {
  ContentSummary,
  ListContentUseCase,
} from "../../content/use-cases/list-content.use-case.js";
import type { ListLessonsUseCase } from "../../lesson/use-cases/list-lessons.use-case.js";
import type { LearnerInsightsReadModel } from "../ports/learner-insights-read-model.js";
import type { CoachTool, CoachToolContext } from "./coach-tool.js";
import { optionalCount, readArguments } from "./tool-arguments.js";

/**
 * Tools that answer "who is this learner and how are they doing" (M23, ADR-034).
 *
 * All four read **only** the session user's own rows, because that is the only user id they are
 * given. None of them exposes an email, a name, a nickname, an avatar, a role, a teacher or another
 * learner: the coach does not need identity to teach, so identity is not offered. Counts are
 * counts — no derived "score", no invented metric (ADR-034, decision 2).
 */

export interface LearnerToolDependencies {
  readonly insights: LearnerInsightsReadModel;
  readonly contentRepository: ContentRepository;
  readonly listContent: ListContentUseCase;
  readonly listLessons: ListLessonsUseCase;
}

/** Items in any list a tool returns. Bounded so one tool call cannot fill the context window. */
const MAX_LIST_ITEMS = 10;

const NO_ARGUMENTS = { type: "object", properties: {}, additionalProperties: false } as const;

/** Ids are content slugs; a title makes a recommendation readable to the learner. */
async function titleOf(
  repository: ContentRepository,
  contentId: string,
): Promise<string | undefined> {
  try {
    const item = await repository.findContent(createContentId(contentId));
    return item?.title;
  } catch {
    // An id that is no longer valid content (renamed, archived): the coach gets the id alone.
    return undefined;
  }
}

function isForLanguage(contentId: string, languageId: string): boolean {
  try {
    return contentIdBelongsToLanguage(createContentId(contentId), createLanguageId(languageId));
  } catch {
    return false;
  }
}

/**
 * The learner's course context: what they are learning, in which language it is explained, and
 * which level the application has them at. The coach needs this before it can pitch an
 * explanation, and the CEFR level comes from here — never from what the learner claims
 * (ADR-034 / the instructions' CEFR rule).
 */
function learnerContextTool(deps: LearnerToolDependencies): CoachTool {
  return {
    declaration: {
      name: "get_learner_context",
      description:
        "The learner's course context: the language they are learning, its CEFR level in this application, and the language explanations are written in. Call this first if you need to pitch an explanation at the right level.",
      parameters: NO_ARGUMENTS,
    },
    async execute(context: CoachToolContext, args: unknown) {
      readArguments(args, []);
      const language = await deps.contentRepository.findLanguage(context.languageId);
      const levels = await deps.contentRepository.listLanguageLevels(context.languageId);
      // The instruction language is a property of the content, not of the account: read it from
      // the level's own items rather than assuming it matches the interface.
      let instructionLanguage: string | undefined;
      if (context.levelId) {
        const items = await deps.listContent
          .execute({ languageId: context.languageId, levelId: context.levelId })
          .catch(() => [] as ContentSummary[]);
        instructionLanguage = items[0]?.instructionLanguage;
      }
      return {
        targetLanguage: { id: context.languageId, name: language?.name ?? context.languageId },
        cefrLevel: context.levelId ?? null,
        levelsAvailable: levels
          .filter((level) => level.status === "available")
          .map((l) => l.levelId),
        instructionLanguage: instructionLanguage ?? null,
        note: "cefrLevel is the level the learner is studying in this application. If it is null, do not guess one.",
      };
    },
  };
}

/** Stored counts for the learner's whole account, straight from the ledger and progress tables. */
function progressSummaryTool(deps: LearnerToolDependencies): CoachTool {
  return {
    declaration: {
      name: "get_progress_summary",
      description:
        "How much the learner has done: lessons completed and in progress, exercise attempts and how many were correct, vocabulary saved/learning/learned, and points earned. These are exact stored counts, not estimates.",
      parameters: NO_ARGUMENTS,
    },
    async execute(context: CoachToolContext, args: unknown) {
      readArguments(args, []);
      const summary = await deps.insights.loadProgressSummary(context.userId);
      return {
        lessonsCompleted: summary.lessonsCompleted,
        lessonsInProgress: summary.lessonsInProgress,
        exerciseAttempts: summary.exerciseAttempts,
        correctAttempts: summary.correctAttempts,
        exercisesEverCorrect: summary.exercisesEverCorrect,
        vocabulary: {
          saved: summary.vocabularySaved,
          learning: summary.vocabularyLearning,
          learned: summary.vocabularyLearned,
        },
        points: summary.points,
        lastActivityAt: summary.lastActivityAt?.toISOString() ?? null,
        note: "An attempt is one submission, retries included. There is no accuracy percentage stored; divide only if it helps the learner, and say it is a ratio of attempts.",
      };
    },
  };
}

/** What the learner did most recently, so the coach can pick up where they left off. */
function recentActivityTool(deps: LearnerToolDependencies): CoachTool {
  return {
    declaration: {
      name: "get_recent_activity",
      description:
        "The learner's most recent lesson and exercise activity, newest first, with titles. Use it to see what they are working on right now.",
      parameters: {
        type: "object",
        properties: {
          limit: { type: "integer", description: "How many events (1-10). Default 6." },
        },
        additionalProperties: false,
      },
    },
    async execute(context: CoachToolContext, args: unknown) {
      const record = readArguments(args, ["limit"]);
      const limit = optionalCount(record, "limit", { min: 1, max: MAX_LIST_ITEMS, fallback: 6 });
      const activity = await deps.insights.loadRecentActivity(context.userId, limit);
      const events = [];
      for (const event of activity) {
        events.push({
          kind: event.kind,
          id: event.contentId,
          title: (await titleOf(deps.contentRepository, event.contentId)) ?? null,
          lessonStatus: event.lessonStatus ?? null,
          correct: event.correct ?? null,
          at: event.at.toISOString(),
        });
      }
      return { events, note: events.length === 0 ? "Nothing recorded yet." : undefined };
    },
  };
}

/**
 * The exercises this learner keeps getting wrong, counted — the honest version of "weak areas".
 *
 * There is no statistical model behind this and the tool says so: it is "four attempts, one
 * correct", which the coach can explain transparently, rather than a black-box percentage the
 * application cannot justify (ADR-034; the brief's "do not invent metrics").
 */
function weakAreasTool(deps: LearnerToolDependencies): CoachTool {
  return {
    declaration: {
      name: "get_weak_areas",
      description:
        "Exercises the learner has attempted but struggles with, worst first, with attempt and correct counts and the lesson each belongs to. Only exercises they have actually attempted appear. There is no weakness score in this application — describe the counts.",
      parameters: {
        type: "object",
        properties: {
          limit: { type: "integer", description: "How many exercises (1-10). Default 5." },
        },
        additionalProperties: false,
      },
    },
    async execute(context: CoachToolContext, args: unknown) {
      const record = readArguments(args, ["limit"]);
      const limit = optionalCount(record, "limit", { min: 1, max: MAX_LIST_ITEMS, fallback: 5 });
      // Over-fetch a little, then keep this language's exercises: ids are language-prefixed, so
      // filtering by id needs no extra query and no language column.
      const stats = await deps.insights.loadWeakestExercises(context.userId, limit * 3);
      const exercises = stats
        .filter((entry) => isForLanguage(entry.exerciseId, context.languageId))
        .slice(0, limit)
        .map((entry) => ({
          exerciseId: entry.exerciseId,
          attempts: entry.attempts,
          correctAttempts: entry.correctAttempts,
          everCorrect: entry.everCorrect,
          lastAttemptAt: entry.lastAttemptAt.toISOString(),
        }));
      return {
        exercises,
        note:
          exercises.length === 0
            ? "No attempted exercises recorded for this language yet — do not claim a weakness."
            : "Call get_exercise_context for any of these to see the question and what the learner answered.",
      };
    },
  };
}

/**
 * A recommendation the coach can defend: the learner's unfinished and unstarted lessons for their
 * level, plus the exercises they are struggling with. The *reasoning* stays with the model; the
 * application contributes only facts, so a recommendation is always traceable to a real record
 * ("you have not completed the restaurant lesson", never "your score is 73%").
 */
function recommendNextActivityTool(deps: LearnerToolDependencies): CoachTool {
  return {
    declaration: {
      name: "recommend_next_activity",
      description:
        "The facts needed to recommend what to study next: the learner's lessons for their level with each one's status, and the exercises they are struggling with. Explain your recommendation from these facts; never invent a reason.",
      parameters: NO_ARGUMENTS,
    },
    async execute(context: CoachToolContext, args: unknown) {
      readArguments(args, []);
      if (!context.levelId) {
        return {
          lessons: [],
          note: "The application does not know this learner's level, so there is no lesson list to recommend from. Ask them which level they are working on.",
        };
      }
      const lessons = await deps.listLessons.execute({
        userId: context.userId,
        languageId: context.languageId,
        levelId: context.levelId,
      });
      const weak = await deps.insights.loadWeakestExercises(context.userId, MAX_LIST_ITEMS);
      return {
        level: context.levelId,
        lessons: lessons.slice(0, MAX_LIST_ITEMS).map((lesson) => ({
          id: lesson.id,
          title: lesson.title,
          status: lesson.progress.status,
        })),
        strugglingExercises: weak
          .filter((entry) => isForLanguage(entry.exerciseId, context.languageId))
          .slice(0, 5)
          .map((entry) => ({
            exerciseId: entry.exerciseId,
            attempts: entry.attempts,
            correctAttempts: entry.correctAttempts,
          })),
        note: "Lesson status is one of not-started, in-progress or completed. Recommend one thing, and say which record led you to it.",
      };
    },
  };
}

export function createLearnerTools(deps: LearnerToolDependencies): readonly CoachTool[] {
  return [
    learnerContextTool(deps),
    progressSummaryTool(deps),
    recentActivityTool(deps),
    weakAreasTool(deps),
    recommendNextActivityTool(deps),
  ];
}
