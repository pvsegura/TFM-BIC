import {
  AskCoachUseCase,
  createCoachToolRegistry,
  createPracticeCollector,
  GetCoachLearnerUseCase,
  resolveCoachContext,
  type CoachContextInput,
  type ResolvedCoachContext,
} from "@verbysia/application";
import { createDefaultExerciseTypeRegistry, type LanguageId } from "@verbysia/domain";

import type { CoachDependencies } from "./coach-dependencies.js";
import type { ContentDependencies } from "./content-dependencies.js";
import type { ContentUseCases } from "./content-use-cases.js";
import type { LessonUseCases } from "./lesson-use-cases.js";
import type { PhoneticsUseCases } from "./phonetics-use-cases.js";
import type { VocabularyUseCases } from "./vocabulary-use-cases.js";

export interface CoachUseCases {
  askCoach: AskCoachUseCase;
  /** What the page shows before the first question: the course context the coach will get. */
  getLearner: GetCoachLearnerUseCase;
  /** The authorised context block of one turn: derived level plus the page the learner is on. */
  resolveContext: (input: {
    userId: string;
    languageId: LanguageId;
    context: CoachContextInput | undefined;
  }) => Promise<ResolvedCoachContext>;
  /** `false` when the deployment switched the coach off. */
  enabled: boolean;
}

/** Coaching turns this process runs at once. Each holds a provider request open for seconds —
 * minutes on a free-tier key (measured 2026-10-07), so this stays small. */
const MAX_CONCURRENT_TURNS = 2;

/**
 * Composition-root wiring only (M23, ADR-034).
 *
 * The coach's tools are **the existing use cases**, not new reads of the same tables: lessons come
 * from `LessonUseCases`, vocabulary from `VocabularyUseCases`, phonetics from `PhoneticsUseCases`,
 * content and grammar from the content dependencies. So M5's visibility rules, M6's progress rules
 * and M9's status rules apply to the coach for free, and a change to any of them changes what the
 * coach sees in the same commit.
 *
 * The registry is built **per request**, because it closes over that request's practice collector
 * (the activity the model proposes is validated into it). Everything expensive — the use cases,
 * the read model, the exercise registry — is constructed once, here.
 */
export function createCoachUseCases(
  deps: CoachDependencies,
  wiring: {
    content: ContentDependencies;
    contentUseCases: ContentUseCases;
    lessonUseCases: LessonUseCases;
    vocabularyUseCases: VocabularyUseCases;
    phoneticsUseCases: PhoneticsUseCases;
  },
): CoachUseCases {
  const exerciseRegistry = createDefaultExerciseTypeRegistry();
  const toolDeps = {
    insights: deps.insights,
    contentRepository: wiring.content.contentRepository,
    listContent: wiring.contentUseCases.listContent,
    listLessons: wiring.lessonUseCases.listLessons,
    getLesson: wiring.lessonUseCases.getLesson,
    listVocabulary: wiring.vocabularyUseCases.listVocabulary,
    getVocabularyItem: wiring.vocabularyUseCases.getVocabularyItem,
    listPhonetics: wiring.phoneticsUseCases.listPhonetics,
    getPhonetic: wiring.phoneticsUseCases.getPhoneticRepresentation,
    grammar: wiring.content.grammarRepository,
    media: wiring.content.mediaCatalog,
    getContent: wiring.contentUseCases.getContent,
    exercises: wiring.content.exerciseRepository,
    registry: exerciseRegistry,
  };

  // A context id is re-authorised through the same use cases the lesson and vocabulary pages use.
  const contextDeps = {
    contentRepository: wiring.content.contentRepository,
    insights: deps.insights,
    getLesson: wiring.lessonUseCases.getLesson,
    getVocabularyItem: wiring.vocabularyUseCases.getVocabularyItem,
  };

  return {
    getLearner: new GetCoachLearnerUseCase(contextDeps),
    resolveContext: (input) => resolveCoachContext(contextDeps, input),
    enabled: deps.enabled,
    askCoach: new AskCoachUseCase({
      agent: deps.agent,
      enabled: deps.enabled,
      maxConcurrent: MAX_CONCURRENT_TURNS,
      turnTimeoutMs: deps.turnTimeoutMs,
      registryFor: () => {
        const practice = createPracticeCollector();
        return {
          registry: createCoachToolRegistry(toolDeps, practice),
          practice: () => practice.activity,
        };
      },
    }),
  };
}
