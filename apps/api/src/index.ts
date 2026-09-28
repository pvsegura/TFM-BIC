import { loadEnv } from "@tfm-bic/config";
import { createDatabaseReadinessCheck, type DatabaseReadinessCheck } from "@tfm-bic/data";

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
import {
  createPhoneticsDependencies,
  type PhoneticsDependencies,
} from "./composition/phonetics-dependencies.js";
import {
  createAudioDependencies,
  type AudioDependencies,
} from "./composition/audio-dependencies.js";
import {
  createEmailDependencies,
  type EmailDependencies,
} from "./composition/email-dependencies.js";
import {
  createPrivacyDependencies,
  type PrivacyDependencies,
} from "./composition/privacy-dependencies.js";
import { createTestDependencies } from "./composition/test-dependencies.js";
import {
  createVideoDependencies,
  type VideoDependencies,
} from "./composition/video-dependencies.js";
import {
  createTeachingDependencies,
  type TeachingDependencies,
} from "./composition/teaching-dependencies.js";
import { createShutdownHandler, waitForDatabase } from "./lifecycle/process-lifecycle.js";
import { buildServer } from "./server.js";

/** Below Docker's default 10 s stop grace period, so we exit on our own terms (M17). */
const SHUTDOWN_TIMEOUT_MS = 8_000;
/** Start-up checks: 1+2+4+8+10 s ≈ 25 s of waiting, enough for a suspended serverless database. */
const STARTUP_DATABASE_ATTEMPTS = 6;
const STARTUP_DATABASE_INITIAL_DELAY_MS = 1_000;

const startedAt = performance.now();

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
let phoneticsDeps: PhoneticsDependencies;
let videoDeps: VideoDependencies;
let audioDeps: AudioDependencies;
let teachingDeps: TeachingDependencies;
let emailDeps: EmailDependencies;
let privacyDeps: PrivacyDependencies;
let readiness: DatabaseReadinessCheck | undefined;
if (env.NODE_ENV === "test") {
  ({
    auth: authDeps,
    profile: profileDeps,
    content: contentDeps,
    lessons: lessonDeps,
    exercises: exerciseDeps,
    gamification: gamificationDeps,
    vocabulary: vocabularyDeps,
    phonetics: phoneticsDeps,
    video: videoDeps,
    audio: audioDeps,
    teaching: teachingDeps,
    email: emailDeps,
    privacy: privacyDeps,
  } = await createTestDependencies(env));
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
  phoneticsDeps = createPhoneticsDependencies(env.DATABASE_URL);
  videoDeps = createVideoDependencies(env.DATABASE_URL, env);
  audioDeps = createAudioDependencies(env);
  teachingDeps = createTeachingDependencies(env.DATABASE_URL);
  emailDeps = createEmailDependencies(env.DATABASE_URL, env);
  privacyDeps = createPrivacyDependencies(env.DATABASE_URL);
  readiness = createDatabaseReadinessCheck(env.DATABASE_URL);
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
  phoneticsDeps,
  videoDeps,
  audioDeps,
  teachingDeps,
  emailDeps,
  privacyDeps,
  { ...(readiness ? { isReady: readiness.isReady } : {}) },
);

// SIGTERM (orchestrator stop) / SIGINT (Ctrl+C): stop accepting requests (Fastify answers 503
// while closing), let in-flight ones finish, release the shared pool, exit — within a hard limit.
const shutdown = createShutdownHandler({
  closeServer: () => app.close(),
  closers: [
    authDeps.close,
    profileDeps.close,
    lessonDeps.close,
    exerciseDeps.close,
    gamificationDeps.close,
    vocabularyDeps.close,
    phoneticsDeps.close,
    videoDeps.close,
    teachingDeps.close,
    emailDeps.close,
    privacyDeps.close,
    ...(readiness ? [readiness.close] : []),
  ],
  timeoutMs: SHUTDOWN_TIMEOUT_MS,
  exit: (code) => process.exit(code),
  log: app.log,
});
process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));

async function start(): Promise<void> {
  // Configuration was validated by loadEnv() above; now the database must answer before the port
  // opens — a process that cannot reach it exits instead of serving errors (M17).
  if (readiness) {
    const reachable = await waitForDatabase(readiness.isReady, {
      attempts: STARTUP_DATABASE_ATTEMPTS,
      initialDelayMs: STARTUP_DATABASE_INITIAL_DELAY_MS,
      log: app.log,
      failureReason: readiness.lastFailureReason,
    });
    if (!reachable) {
      app.log.error(
        { attempts: STARTUP_DATABASE_ATTEMPTS, reason: readiness.lastFailureReason() },
        "database.unreachable_giving_up",
      );
      await shutdown("startup-failure", { failed: true });
      return;
    }
  }
  try {
    await app.listen({ port: env.PORT, host: "0.0.0.0" });
    app.log.info(
      {
        nodeEnv: env.NODE_ENV,
        version: env.APP_VERSION,
        startupMs: Math.round(performance.now() - startedAt),
      },
      "server.started",
    );
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
}

void start();
