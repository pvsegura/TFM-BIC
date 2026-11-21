import { createLanguageId, isValidLanguageId } from "@verbysia/domain";

import { resolveCoachContext, type CoachContextDependencies } from "../resolve-coach-context.js";

export interface CoachLearner {
  languageId: string;
  languageName: string;
  /** The level the application derived (`resolveCoachContext`), as a label such as "A2". */
  cefrLevel: string | null;
}

/**
 * What the coach page shows before the first question (M23, ADR-034): the course context the
 * coach *will* be given — in particular the level the application derived, so a learner sees it
 * rather than guessing. An unknown or malformed language is simply "no course context"
 * (`null`), not an error: the coach is still available and the page still works.
 */
export class GetCoachLearnerUseCase {
  constructor(private readonly deps: CoachContextDependencies) {}

  async execute(input: { userId: string; language: string }): Promise<CoachLearner | null> {
    if (!isValidLanguageId(input.language)) return null;
    const languageId = createLanguageId(input.language);
    try {
      const language = await this.deps.contentRepository.findLanguage(languageId);
      if (!language) return null;
      const resolved = await resolveCoachContext(this.deps, {
        userId: input.userId,
        languageId,
        context: undefined,
      });
      return {
        languageId,
        languageName: language.name,
        cefrLevel: resolved.levelId?.toUpperCase() ?? null,
      };
    } catch {
      // A status check never fails because of the course context: without one, the page still
      // offers the coach.
      return null;
    }
  }
}
