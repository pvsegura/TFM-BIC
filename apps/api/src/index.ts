import { loadEnv } from "@tfm-bic/config";

import { createAuthDependencies, type AuthDependencies } from "./composition/auth-dependencies.js";
import {
  createProfileDependencies,
  type ProfileDependencies,
} from "./composition/profile-dependencies.js";
import {
  createContentDependencies,
  type ContentDependencies,
} from "./composition/content-dependencies.js";
import {
  createLessonDependencies,
  type LessonDependencies,
} from "./composition/lesson-dependencies.js";
import {
  createExerciseDependencies,
  type ExerciseDependencies,
} from "./composition/exercise-dependencies.js";
import {
  createGamificationDependencies,
  type GamificationDependencies,
} from "./composition/gamification-dependencies.js";
import {
  createVocabularyDependencies,
  type VocabularyDependencies,
} from "./composition/vocabulary-dependencies.js";
import { createTestDependencies } from "./composition/test-dependencies.js";
import { buildServer } from "./server.js";

const env = loadEnv();

// NODE_ENV=test: an in-process PGlite instance instead of a live Postgres
// connection (see docs/adr/adr-005-database.md) — lets E2E tests run the
// real server/HTTP stack with no Docker/network database. loadEnv() does
// not require DATABASE_URL in this case. Every other environment requires
// a real DATABASE_URL and fails fast without one (defensive re-check below
// — the primary guard is loadEnv() itself).
let authDeps: AuthDependencies;
let profileDeps: ProfileDependencies;
let contentDeps: ContentDependencies;
let lessonDeps: LessonDependencies;
let exerciseDeps: ExerciseDependencies;
let gamificationDeps: GamificationDependencies;
let vocabularyDeps: VocabularyDependencies;
if (env.NODE_ENV === "test") {
  ({
    auth: authDeps,
    profile: profileDeps,
    content: contentDeps,
    lessons: lessonDeps,
    exercises: exerciseDeps,
    gamification: gamificationDeps,
    vocabulary: vocabularyDeps,
  } = await createTestDependencies(env.CONTENT_DIR));
} else {
  if (!env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required outside of NODE_ENV=test.");
  }
  authDeps = createAuthDependencies(env.DATABASE_URL);
  profileDeps = createProfileDependencies(env.DATABASE_URL);
  contentDeps = await createContentDependencies(env.CONTENT_DIR);
  lessonDeps = createLessonDependencies(env.DATABASE_URL);
  exerciseDeps = createExerciseDependencies(env.DATABASE_URL);
  gamificationDeps = createGamificationDependencies(env.DATABASE_URL);
  vocabularyDeps = createVocabularyDependencies(env.DATABASE_URL);
}

const app = buildServer(
  env,
  authDeps,
  profileDeps,
  contentDeps,
  lessonDeps,
  exerciseDeps,
  gamificationDeps,
  vocabularyDeps,
);

async function start(): Promise<void> {
  try {
    await app.listen({ port: env.PORT, host: "0.0.0.0" });
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
}

async function shutdown(signal: string): Promise<void> {
  app.log.info({ signal }, "Shutting down");
  await app.close();
  await Promise.all([
    authDeps.close(),
    profileDeps.close(),
    lessonDeps.close(),
    exerciseDeps.close(),
    gamificationDeps.close(),
    vocabularyDeps.close(),
  ]);
  process.exit(0);
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));

void start();
