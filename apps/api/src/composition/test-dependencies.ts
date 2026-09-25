import type { AppEnv } from "@tfm-bic/config";
import { createGamificationTestDb } from "@tfm-bic/data/testing";

import { buildAuthDependencies, type AuthDependencies } from "./auth-dependencies.js";
import { createContentDependencies, type ContentDependencies } from "./content-dependencies.js";
import { buildExerciseDependencies, type ExerciseDependencies } from "./exercise-dependencies.js";
import {
  buildGamificationDependencies,
  type GamificationDependencies,
} from "./gamification-dependencies.js";
import { buildLessonDependencies, type LessonDependencies } from "./lesson-dependencies.js";
import {
  buildPhoneticsDependencies,
  type PhoneticsDependencies,
} from "./phonetics-dependencies.js";
import { buildProfileDependencies, type ProfileDependencies } from "./profile-dependencies.js";
import {
  buildVideoDependencies,
  selectVideoGenerationProvider,
  type VideoDependencies,
} from "./video-dependencies.js";
import {
  buildVocabularyDependencies,
  type VocabularyDependencies,
} from "./vocabulary-dependencies.js";

/**
 * Same real adapters as the production composition, except the database is
 * one in-process PGlite instance (a real, WASM-compiled Postgres — not a
 * mock) instead of a live Postgres connection — see
 * docs/adr/adr-005-database.md. Used only when `NODE_ENV=test`
 * (apps/api/src/index.ts) so E2E tests run against the real server/HTTP
 * stack with no Docker/network database.
 *
 * Auth, profile, lessons, exercises, gamification, vocabulary and phonetics deliberately share
 * that single instance: in production they are one database, and `student_profiles`,
 * `lesson_progress`, `exercise_attempts`, `point_transactions`, `user_achievements`,
 * `user_vocabulary` and `user_phonetic_progress` all have a foreign key to `users`, so they can
 * only exist alongside the user they belong to. The instance is closed once, via `auth.close`;
 * the other `close`s are no-ops so shutting everything down never closes it twice.
 */
export async function createTestDependencies(env: AppEnv): Promise<{
  auth: AuthDependencies;
  profile: ProfileDependencies;
  content: ContentDependencies;
  lessons: LessonDependencies;
  exercises: ExerciseDependencies;
  gamification: GamificationDependencies;
  vocabulary: VocabularyDependencies;
  phonetics: PhoneticsDependencies;
  video: VideoDependencies;
}> {
  const {
    db,
    identityDb,
    profileDb,
    lessonsDb,
    exercisesDb,
    vocabularyDb,
    phoneticsDb,
    videoDb,
    close,
  } = await createGamificationTestDb();

  return {
    auth: buildAuthDependencies(identityDb, close),
    profile: buildProfileDependencies(profileDb, () => Promise.resolve()),
    // The real content tree, so E2E exercises the shipped Polish A1 content end to end.
    content: await createContentDependencies(env.CONTENT_DIR),
    lessons: buildLessonDependencies(lessonsDb, () => Promise.resolve()),
    exercises: buildExerciseDependencies(exercisesDb, () => Promise.resolve()),
    gamification: buildGamificationDependencies(db, () => Promise.resolve()),
    vocabulary: buildVocabularyDependencies(vocabularyDb, () => Promise.resolve()),
    phonetics: buildPhoneticsDependencies(phoneticsDb, () => Promise.resolve()),
    // Same provider selection as production (env.VIDEO_GENERATION_PROVIDER) — "fake" by default,
    // so E2E never depends on Hyperframes/FFmpeg/headless Chrome being available.
    video: buildVideoDependencies(videoDb, selectVideoGenerationProvider(env), () =>
      Promise.resolve(),
    ),
  };
}
