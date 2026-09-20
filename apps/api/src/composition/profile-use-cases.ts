import {
  GetCurrentStudentProfileUseCase,
  UpdateCurrentStudentProfileUseCase,
} from "@tfm-bic/application";

import type { ProfileDependencies } from "./profile-dependencies.js";

export interface ProfileUseCases {
  getCurrentProfile: GetCurrentStudentProfileUseCase;
  updateCurrentProfile: UpdateCurrentStudentProfileUseCase;
}

/** Composition-root wiring only — see profile-dependencies.ts. */
export function createProfileUseCases(deps: ProfileDependencies): ProfileUseCases {
  return {
    getCurrentProfile: new GetCurrentStudentProfileUseCase(deps.profileRepository),
    updateCurrentProfile: new UpdateCurrentStudentProfileUseCase(deps.profileRepository),
  };
}
