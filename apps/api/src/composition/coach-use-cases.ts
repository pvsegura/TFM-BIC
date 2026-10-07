import {
  AskCoachUseCase,
  createCoachToolRegistry,
  createPracticeCollector,
} from "@tfm-bic/application";
import { createDefaultExerciseTypeRegistry } from "@tfm-bic/domain";

import type { CoachDependencies } from "./coach-dependencies.js";
import type { ContentDependencies } from "./content-dependencies.js";
import type { ContentUseCases } from "./content-use-cases.js";
import type { LessonUseCases } from "./lesson-use-cases.js";
import type { PhoneticsUseCases } from "./phonetics-use-cases.js";
import type { VocabularyUseCases } from "./vocabulary-use-cases.js";

export interface CoachUseCases {
  askCoach: AskCoachUseCase;
}

/** Coaching turns this process runs at once. Each holds a provider request open for seconds. */
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

  return {
    askCoach: new AskCoachUseCase({
      agent: deps.agent,
      enabled: deps.enabled,
      maxConcurrent: MAX_CONCURRENT_TURNS,
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
