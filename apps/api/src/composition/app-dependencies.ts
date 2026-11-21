import type { AppEnv } from "@verbysia/config";

import { createAudioDependencies, type AudioDependencies } from "./audio-dependencies.js";
import { createAuthDependencies, type AuthDependencies } from "./auth-dependencies.js";
import { createCoachDependencies, type CoachDependencies } from "./coach-dependencies.js";
import { createContentDependencies, type ContentDependencies } from "./content-dependencies.js";
import { createEmailDependencies, type EmailDependencies } from "./email-dependencies.js";
import { createExerciseDependencies, type ExerciseDependencies } from "./exercise-dependencies.js";
import {
  createGamificationDependencies,
  type GamificationDependencies,
} from "./gamification-dependencies.js";
import { createLessonDependencies, type LessonDependencies } from "./lesson-dependencies.js";
import {
  createPhoneticsDependencies,
  type PhoneticsDependencies,
} from "./phonetics-dependencies.js";
import { createPrivacyDependencies, type PrivacyDependencies } from "./privacy-dependencies.js";
import { createProfileDependencies, type ProfileDependencies } from "./profile-dependencies.js";
import { createTeachingDependencies, type TeachingDependencies } from "./teaching-dependencies.js";
import { createCommerceDependencies, type CommerceDependencies } from "./verbysia-dependencies.js";
import {
  createVocabularyDependencies,
  type VocabularyDependencies,
} from "./vocabulary-dependencies.js";

/** Every bounded context's dependencies, by context — what `buildServer` is built from. */
export interface AppDependencies {
  auth: AuthDependencies;
  profile: ProfileDependencies;
  content: ContentDependencies;
  lessons: LessonDependencies;
  exercises: ExerciseDependencies;
  gamification: GamificationDependencies;
  vocabulary: VocabularyDependencies;
  phonetics: PhoneticsDependencies;
  audio: AudioDependencies;
  teaching: TeachingDependencies;
  email: EmailDependencies;
  privacy: PrivacyDependencies;
  coach: CoachDependencies;
  commerce: CommerceDependencies;
}

/** The real adapters over a live Postgres `DATABASE_URL` and the content folder. */
export async function createAppDependencies(
  env: AppEnv,
  databaseUrl: string,
): Promise<AppDependencies> {
  return {
    auth: createAuthDependencies(databaseUrl),
    profile: createProfileDependencies(databaseUrl),
    content: await createContentDependencies(env.CONTENT_DIR),
    lessons: createLessonDependencies(databaseUrl),
    exercises: createExerciseDependencies(databaseUrl),
    gamification: createGamificationDependencies(databaseUrl),
    vocabulary: createVocabularyDependencies(databaseUrl),
    phonetics: createPhoneticsDependencies(databaseUrl),
    audio: createAudioDependencies(env),
    teaching: createTeachingDependencies(databaseUrl),
    email: createEmailDependencies(databaseUrl, env),
    privacy: createPrivacyDependencies(databaseUrl),
    coach: createCoachDependencies(env, databaseUrl),
    commerce: createCommerceDependencies(databaseUrl),
  };
}

/** What a graceful shutdown releases: every context that holds a connection. */
export function connectionClosers(deps: AppDependencies): (() => Promise<void>)[] {
  return [
    deps.auth.close,
    deps.profile.close,
    deps.lessons.close,
    deps.exercises.close,
    deps.gamification.close,
    deps.vocabulary.close,
    deps.phonetics.close,
    deps.teaching.close,
    deps.email.close,
    deps.privacy.close,
    deps.coach.close,
    deps.commerce.close,
  ];
}
