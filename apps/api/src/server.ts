import { randomBytes } from "node:crypto";

import { GetHealthStatusUseCase } from "@tfm-bic/application";
import type { AppEnv } from "@tfm-bic/config";
import { SystemClock } from "@tfm-bic/data";
import fastifyCookie from "@fastify/cookie";
import fastifyRateLimit from "@fastify/rate-limit";
import Fastify, { type FastifyError, type FastifyInstance } from "fastify";

import type { AuthDependencies } from "./composition/auth-dependencies.js";
import { createAuthUseCases } from "./composition/auth-use-cases.js";
import type { ContentDependencies } from "./composition/content-dependencies.js";
import type { ExerciseDependencies } from "./composition/exercise-dependencies.js";
import { createExerciseUseCases } from "./composition/exercise-use-cases.js";
import { createContentUseCases } from "./composition/content-use-cases.js";
import type { LessonDependencies } from "./composition/lesson-dependencies.js";
import { createLessonUseCases } from "./composition/lesson-use-cases.js";
import type { ProfileDependencies } from "./composition/profile-dependencies.js";
import { createProfileUseCases } from "./composition/profile-use-cases.js";
import { registerAuthRoutes } from "./routes/auth.route.js";
import { registerContentRoutes } from "./routes/content.route.js";
import { registerExerciseRoutes } from "./routes/exercises.route.js";
import { registerHealthRoutes } from "./routes/health.route.js";
import { registerLanguageRoutes } from "./routes/languages.route.js";
import { registerLessonRoutes } from "./routes/lessons.route.js";
import { registerProfileRoutes } from "./routes/profile.route.js";
import { registerTestEmailRoutes } from "./routes/test-email.route.js";

export function buildServer(
  env: AppEnv,
  authDeps: AuthDependencies,
  profileDeps: ProfileDependencies,
  contentDeps: ContentDependencies,
  lessonDeps: LessonDependencies,
  exerciseDeps: ExerciseDependencies,
): FastifyInstance {
  const app = Fastify({
    logger: {
      level: env.NODE_ENV === "test" ? "silent" : "info",
      // Never log secrets/PII — see docs/security/security-baseline.md.
      redact: ["req.headers.authorization", "req.headers.cookie", "res.headers['set-cookie']"],
    },
  });

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
    registerHealthRoutes(app, { useCase: healthUseCase, env });

    const authUseCases = createAuthUseCases(authDeps, env.APP_BASE_URL);
    registerAuthRoutes(app, { useCases: authUseCases, env });

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

    // Lessons (M6) are authenticated-only: they build on the content use cases and add only the
    // student's own progress. The user always comes from the session, never from the request.
    registerLessonRoutes(app, {
      useCases: createLessonUseCases(contentUseCases, lessonDeps),
      resolveSession: authUseCases.resolveSession,
      env,
    });

    // Exercises (M7) are authenticated-only too: they build on the content and lesson rules, and
    // add only the student's own attempts. The server evaluates every answer; the user always
    // comes from the session, never from the request.
    registerExerciseRoutes(app, {
      useCases: createExerciseUseCases(contentUseCases, contentDeps, exerciseDeps),
      resolveSession: authUseCases.resolveSession,
      env,
    });

    registerTestEmailRoutes(app, { env, emailInbox: authDeps.emailInbox });
  });

  app.setErrorHandler((error: FastifyError, request, reply) => {
    request.log.error({ err: error }, "Unhandled request error");
    /* v8 ignore next -- @preserve: defensive fallback for Fastify's own
       internal errors (e.g. malformed request bodies), which set
       error.statusCode; auth routes map their own known errors before
       reaching here (see routes/auth-error.mapper.ts), so only the `?? 500`
       side is reachable from today's routes. */
    const statusCode = error.statusCode ?? 500;
    reply.status(statusCode).send({ error: "Internal Server Error" });
  });

  return app;
}
