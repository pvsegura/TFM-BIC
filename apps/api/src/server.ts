import { randomBytes } from "node:crypto";

import { GetHealthStatusUseCase } from "@tfm-bic/application";
import type { AppEnv } from "@tfm-bic/config";
import { SystemClock } from "@tfm-bic/data";
import fastifyCookie from "@fastify/cookie";
import fastifyRateLimit from "@fastify/rate-limit";
import Fastify, { type FastifyInstance } from "fastify";

import type { AudioDependencies } from "./composition/audio-dependencies.js";
import { createAudioUseCases } from "./composition/audio-use-cases.js";
import type { AuthDependencies } from "./composition/auth-dependencies.js";
import { createAuthUseCases } from "./composition/auth-use-cases.js";
import type { ContentDependencies } from "./composition/content-dependencies.js";
import type { ExerciseDependencies } from "./composition/exercise-dependencies.js";
import { createExerciseUseCases } from "./composition/exercise-use-cases.js";
import type { GamificationDependencies } from "./composition/gamification-dependencies.js";
import { createGamificationUseCases } from "./composition/gamification-use-cases.js";
import { createContentUseCases } from "./composition/content-use-cases.js";
import type { EmailDependencies } from "./composition/email-dependencies.js";
import { createEmailUseCases } from "./composition/email-use-cases.js";
import type { LessonDependencies } from "./composition/lesson-dependencies.js";
import { createLessonUseCases } from "./composition/lesson-use-cases.js";
import type { PhoneticsDependencies } from "./composition/phonetics-dependencies.js";
import { createPhoneticsUseCases } from "./composition/phonetics-use-cases.js";
import type { PrivacyDependencies } from "./composition/privacy-dependencies.js";
import { createPrivacyUseCases } from "./composition/privacy-use-cases.js";
import type { ProfileDependencies } from "./composition/profile-dependencies.js";
import { createProfileUseCases } from "./composition/profile-use-cases.js";
import type { TeachingDependencies } from "./composition/teaching-dependencies.js";
import { createTeachingUseCases } from "./composition/teaching-use-cases.js";
import type { VideoDependencies } from "./composition/video-dependencies.js";
import { createVideoUseCases } from "./composition/video-use-cases.js";
import type { VocabularyDependencies } from "./composition/vocabulary-dependencies.js";
import { createVocabularyUseCases } from "./composition/vocabulary-use-cases.js";
import { registerAudioGenerationRoutes } from "./routes/audio-generations.route.js";
import { registerAuthRoutes } from "./routes/auth.route.js";
import { registerContentRoutes } from "./routes/content.route.js";
import { registerDataManagementRoutes } from "./routes/data-management.route.js";
import { registerEmailPreferencesRoutes } from "./routes/email-preferences.route.js";
import { registerExerciseRoutes } from "./routes/exercises.route.js";
import { registerGamificationRoutes } from "./routes/gamification.route.js";
import { registerHealthRoutes } from "./routes/health.route.js";
import { registerLanguageRoutes } from "./routes/languages.route.js";
import { registerLessonRoutes } from "./routes/lessons.route.js";
import { registerPhoneticsRoutes } from "./routes/phonetics.route.js";
import { registerProfileRoutes } from "./routes/profile.route.js";
import { registerTeacherDashboardRoutes } from "./routes/teacher-dashboard.route.js";
import { registerTeacherDashboardTestSupportRoutes } from "./routes/teacher-dashboard-test-support.route.js";
import { registerTestEmailRoutes } from "./routes/test-email.route.js";
import { registerVideoGenerationRoutes } from "./routes/video-generations.route.js";
import { registerVocabularyRoutes } from "./routes/vocabulary.route.js";
import { createLoggerOptions } from "./logging/logger-options.js";
import { httpSecurityServerOptions, registerHttpSecurity } from "./security/http-security.js";

/** Process-level wiring that is not a bounded context's dependency (M17). */
export interface ServerRuntimeOptions {
  /** Backs GET /ready. index.ts wires the real database check; the in-process NODE_ENV=test
   * database is always available, so tests may leave it out. */
  isReady?: () => Promise<boolean>;
}

export function buildServer(
  env: AppEnv,
  authDeps: AuthDependencies,
  profileDeps: ProfileDependencies,
  contentDeps: ContentDependencies,
  lessonDeps: LessonDependencies,
  exerciseDeps: ExerciseDependencies,
  gamificationDeps: GamificationDependencies,
  vocabularyDeps: VocabularyDependencies,
  phoneticsDeps: PhoneticsDependencies,
  videoDeps: VideoDependencies,
  audioDeps: AudioDependencies,
  teachingDeps: TeachingDependencies,
  emailDeps: EmailDependencies,
  privacyDeps: PrivacyDependencies,
  runtime: ServerRuntimeOptions = {},
): FastifyInstance {
  // Never log secrets/PII: redaction, no query strings, allowlisted errors (logger-options.ts).
  // Body limit, request timeout, random request ids and TRUST_PROXY: security/http-security.ts (M16).
  const app = Fastify({
    logger: createLoggerOptions(env.NODE_ENV),
    ...httpSecurityServerOptions(env),
  });
  // Security headers, no-store default, X-Request-Id, safe error and 404 bodies (M16, ADR-027).
  registerHttpSecurity(app, env);

  // Session cookie signing secret (ADR-006). Required in production/
  // staging by packages/config's loadEnv(); falls back to an ephemeral
  // per-process secret in development/test, where sessions don't need to
  // survive a restart.
  const sessionSecret = env.AUTH_SESSION_SECRET ?? randomBytes(32).toString("hex");
  if (!env.AUTH_SESSION_SECRET) {
    app.log.warn(
      "AUTH_SESSION_SECRET not set — using an ephemeral per-process secret (fine for dev/test only).",
    );
  }

  void app.register(fastifyCookie, { secret: sessionSecret });
  // No blanket limit on every route (e.g. /health) — each auth route opts
  // in with its own `config.rateLimit` (see routes/auth.route.ts).
  void app.register(fastifyRateLimit, { global: false });

  // `.after()` defers route registration until the plugins above have
  // finished booting — @fastify/rate-limit wires its per-route rate-limit
  // hook via its own `onRoute` hook during that boot, which does not apply
  // retroactively to routes added before it (routes declared directly on
  // `app`, like these, aren't queued the same way `.register()` calls are).
  app.after(() => {
    const healthUseCase = new GetHealthStatusUseCase(new SystemClock());
    registerHealthRoutes(app, {
      useCase: healthUseCase,
      env,
      isReady: runtime.isReady ?? (() => Promise.resolve(true)),
    });

    // Email (M14, ADR-014/025): transactional and marketing senders over one provider — "fake"
    // (sends nothing) unless another is configured. Each delivery attempt is logged with its
    // category, template, adapter and outcome only — never the recipient, subject or a link.
    const emailUseCases = createEmailUseCases(emailDeps, env, {
      record: (event) => {
        if (event.outcome === "failed") {
          app.log.warn(event, "email.delivery_failed");
        } else {
          app.log.info(event, "email.delivery_accepted");
        }
      },
    });
    if (emailDeps.provider.name === "fake" && env.NODE_ENV !== "test") {
      app.log.warn(
        "EMAIL_PROVIDER=fake — no email leaves this process (no real provider is selected, ADR-014).",
      );
    }

    const authUseCases = createAuthUseCases(
      authDeps,
      env.APP_BASE_URL,
      emailUseCases.identityEmailService,
    );
    registerAuthRoutes(app, { useCases: authUseCases, env });

    // Email preferences and newsletter (M14): the session user's own preferences, plus the
    // token-authorized confirmation and unsubscribe links (ADR-025).
    registerEmailPreferencesRoutes(app, {
      useCases: emailUseCases,
      resolveSession: authUseCases.resolveSession,
      env,
    });

    // Profile routes reuse auth's session resolution: identity always comes
    // from the authenticated session, never from the request.
    registerProfileRoutes(app, {
      useCases: createProfileUseCases(profileDeps),
      resolveSession: authUseCases.resolveSession,
      env,
    });

    // Language/content discovery is public and read-only (ADR-018): no session, no user data.
    const contentUseCases = createContentUseCases(contentDeps);
    registerLanguageRoutes(app, { useCases: contentUseCases, env });
    registerContentRoutes(app, { useCases: contentUseCases, env });

    // Gamification (M8): points and achievements. Rewards are granted only inside the exercise and
    // lesson use cases below (through `awardRewards`), never by a route that asks for them.
    const gamificationUseCases = createGamificationUseCases(gamificationDeps);
    const { achievementTexts } = gamificationUseCases;

    // Lessons (M6) are authenticated-only: they build on the content use cases and add only the
    // student's own progress. The user always comes from the session, never from the request.
    registerLessonRoutes(app, {
      useCases: createLessonUseCases(contentUseCases, lessonDeps, gamificationUseCases),
      resolveSession: authUseCases.resolveSession,
      env,
      achievementTexts,
    });

    // Exercises (M7) are authenticated-only too: they build on the content and lesson rules, and
    // add only the student's own attempts. The server evaluates every answer; the user always
    // comes from the session, never from the request.
    registerExerciseRoutes(app, {
      useCases: createExerciseUseCases(
        contentUseCases,
        contentDeps,
        exerciseDeps,
        gamificationUseCases,
      ),
      resolveSession: authUseCases.resolveSession,
      env,
      achievementTexts,
    });

    // The student's own points and achievements: read-only, session-derived, no `:userId`.
    registerGamificationRoutes(app, {
      useCases: gamificationUseCases,
      resolveSession: authUseCases.resolveSession,
      env,
    });

    // Vocabulary (M9): entries are content, reused from contentDeps; only the student's own
    // relationship to a word is stored. The user always comes from the session.
    registerVocabularyRoutes(app, {
      useCases: createVocabularyUseCases(contentDeps, vocabularyDeps),
      resolveSession: authUseCases.resolveSession,
      env,
    });

    // Phonetics (M10): representations are content, reused from contentDeps; only the student's
    // own progress is stored. Independent of Vocabulary. The user always comes from the session.
    registerPhoneticsRoutes(app, {
      useCases: createPhoneticsUseCases(contentDeps, phoneticsDeps),
      resolveSession: authUseCases.resolveSession,
      env,
    });

    // Video generation (M11): definitions are content, reused from contentDeps; only the
    // student's own generation jobs are stored. The user always comes from the session. The
    // provider behind this is selected by env.VIDEO_GENERATION_PROVIDER (ADR-011/012) — "fake" by
    // default and in every automated test/CI run.
    registerVideoGenerationRoutes(app, {
      useCases: createVideoUseCases(contentDeps, videoDeps),
      resolveSession: authUseCases.resolveSession,
      env,
    });

    // Audio generation (M12): the text comes from content (contentDeps), never the client; nothing
    // is persisted. The provider is selected by env.AUDIO_GENERATION_PROVIDER (ADR-013) — "fake" by
    // default and in every automated test/CI run.
    registerAudioGenerationRoutes(app, {
      useCases: createAudioUseCases(contentDeps, audioDeps),
      resolveSession: authUseCases.resolveSession,
      env,
    });

    // Teacher dashboard (M13): TEACHER-only and read-only. It aggregates the authoritative lesson,
    // exercise and gamification records through a teacher-scoped read model (ADR-024); the teacher
    // always comes from the session and a student is only reachable through the teacher's links.
    const teachingUseCases = createTeachingUseCases(teachingDeps, {
      contentUseCases,
      contentDeps,
      gamificationDeps,
      userRepository: authDeps.userRepository,
    });
    registerTeacherDashboardRoutes(app, {
      useCases: teachingUseCases,
      resolveSession: authUseCases.resolveSession,
      env,
    });
    registerTeacherDashboardTestSupportRoutes(app, {
      env,
      enabled: teachingDeps.enableTestSupportRoutes === true,
      useCases: teachingUseCases,
    });

    // Privacy & Data Management (M15, ADR-026): the session user's own export and account
    // deletion. Deletion re-checks the password through Identity's own repository and hasher.
    registerDataManagementRoutes(app, {
      useCases: createPrivacyUseCases(privacyDeps, authDeps),
      resolveSession: authUseCases.resolveSession,
      env,
    });

    registerTestEmailRoutes(app, {
      env,
      emailInbox: emailDeps.inbox,
      enableIssueRoute: emailDeps.enableTestSupportRoutes,
      useCases: emailUseCases,
    });
  });

  return app;
}
