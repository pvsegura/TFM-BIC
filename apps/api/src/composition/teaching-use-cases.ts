import {
  GetTeacherOverviewUseCase,
  GetTeacherStudentDetailUseCase,
  LinkStudentToTeacherUseCase,
  ListTeacherStudentsUseCase,
  PromoteUserToTeacherUseCase,
  type AchievementTexts,
  type UserRepository,
} from "@tfm-bic/application";

import type { ContentDependencies } from "./content-dependencies.js";
import type { ContentUseCases } from "./content-use-cases.js";
import type { GamificationDependencies } from "./gamification-dependencies.js";
import type { TeachingDependencies } from "./teaching-dependencies.js";

export interface TeachingUseCases {
  getOverview: GetTeacherOverviewUseCase;
  listStudents: ListTeacherStudentsUseCase;
  getStudentDetail: GetTeacherStudentDetailUseCase;
  achievementTexts: AchievementTexts;
  /** Operator commands — reached over HTTP only through the NODE_ENV=test-only support route. */
  promoteToTeacher: PromoteUserToTeacherUseCase;
  linkStudent: LinkStudentToTeacherUseCase;
}

/**
 * Composition-root wiring only. The student detail reuses the other contexts' own adapters —
 * content visibility (M5), exercises (M7), the points ledger and achievement texts (M8) — rather
 * than re-reading their tables.
 */
export function createTeachingUseCases(
  deps: TeachingDependencies,
  context: {
    contentUseCases: ContentUseCases;
    contentDeps: ContentDependencies;
    gamificationDeps: GamificationDependencies;
    userRepository: UserRepository;
  },
): TeachingUseCases {
  const { readModel, linkRepository, clock } = deps;
  const { contentUseCases, contentDeps, gamificationDeps, userRepository } = context;
  return {
    getOverview: new GetTeacherOverviewUseCase(readModel, clock),
    listStudents: new ListTeacherStudentsUseCase(readModel, clock),
    getStudentDetail: new GetTeacherStudentDetailUseCase({
      readModel,
      listContent: contentUseCases.listContent,
      contentRepository: contentDeps.contentRepository,
      exerciseRepository: contentDeps.exerciseRepository,
      gamificationRepository: gamificationDeps.gamificationRepository,
      achievementRegistry: gamificationDeps.achievementRegistry,
      achievementTexts: gamificationDeps.achievementTexts,
      clock,
    }),
    achievementTexts: gamificationDeps.achievementTexts,
    promoteToTeacher: new PromoteUserToTeacherUseCase(userRepository, linkRepository),
    linkStudent: new LinkStudentToTeacherUseCase(userRepository, linkRepository, clock),
  };
}
