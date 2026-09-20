import type { StudentProfile } from "@tfm-bic/domain";

import type { ProfileRepository } from "../ports/profile-repository.js";

export interface GetCurrentStudentProfileInput {
  /** Must come from the authenticated session — never from client input. */
  userId: string;
}

/**
 * Returns the student's saved profile, or `null` if they have not saved one
 * yet (the caller renders that as an empty profile). Reading never creates a
 * row — a GET has no side effects.
 */
export class GetCurrentStudentProfileUseCase {
  constructor(private readonly profileRepository: ProfileRepository) {}

  execute(input: GetCurrentStudentProfileInput): Promise<StudentProfile | null> {
    return this.profileRepository.findByUserId(input.userId);
  }
}
