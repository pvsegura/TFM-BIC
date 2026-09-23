import {
  CompletePhoneticUseCase,
  GetPhoneticRepresentationUseCase,
  ListPhoneticsUseCase,
  ListPhoneticTopicsUseCase,
  RecordPhoneticPracticeUseCase,
  RecordPhoneticViewUseCase,
} from "@tfm-bic/application";

import type { ContentDependencies } from "./content-dependencies.js";
import type { PhoneticsDependencies } from "./phonetics-dependencies.js";

export interface PhoneticsUseCases {
  listPhonetics: ListPhoneticsUseCase;
  getPhoneticRepresentation: GetPhoneticRepresentationUseCase;
  listPhoneticTopics: ListPhoneticTopicsUseCase;
  recordPhoneticView: RecordPhoneticViewUseCase;
  recordPhoneticPractice: RecordPhoneticPracticeUseCase;
  completePhonetic: CompletePhoneticUseCase;
}

/**
 * Composition-root wiring only. Every use case is built on the same two things: the content
 * dependencies' `contentRepository` (for the M5 language/level visibility rule) and
 * `phoneticRepository` (topics and representations), plus the student's own progress store and
 * the clock.
 */
export function createPhoneticsUseCases(
  content: ContentDependencies,
  deps: PhoneticsDependencies,
): PhoneticsUseCases {
  const { contentRepository, phoneticRepository } = content;
  const { userPhoneticProgressRepository, clock } = deps;

  return {
    listPhonetics: new ListPhoneticsUseCase(
      contentRepository,
      phoneticRepository,
      userPhoneticProgressRepository,
    ),
    getPhoneticRepresentation: new GetPhoneticRepresentationUseCase(
      contentRepository,
      phoneticRepository,
      userPhoneticProgressRepository,
    ),
    listPhoneticTopics: new ListPhoneticTopicsUseCase(
      contentRepository,
      phoneticRepository,
      userPhoneticProgressRepository,
    ),
    recordPhoneticView: new RecordPhoneticViewUseCase(
      contentRepository,
      phoneticRepository,
      userPhoneticProgressRepository,
      clock,
    ),
    recordPhoneticPractice: new RecordPhoneticPracticeUseCase(
      contentRepository,
      phoneticRepository,
      userPhoneticProgressRepository,
      clock,
    ),
    completePhonetic: new CompletePhoneticUseCase(
      contentRepository,
      phoneticRepository,
      userPhoneticProgressRepository,
      clock,
    ),
  };
}
