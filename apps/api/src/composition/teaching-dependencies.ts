import type {
  Clock,
  TeacherDashboardReadModel,
  TeacherStudentLinkRepository,
} from "@tfm-bic/application";
import {
  createTeachingDb,
  DrizzleTeacherDashboardReadModel,
  DrizzleTeacherStudentLinkRepository,
  SystemClock,
  type TeachingDb,
} from "@tfm-bic/data";

/**
 * Everything the teacher dashboard needs beyond what other contexts already provide (content,
 * gamification, identity): the teacher-scoped read model, the link store and a clock. One bag so
 * `server.ts` doesn't hand-wire constructors and tests can substitute fakes (see
 * test-support/build-test-deps.ts). Composition-root wiring only, excluded from coverage like
 * the other `*-dependencies.ts` files that build real Drizzle adapters.
 */
export interface TeachingDependencies {
  readModel: TeacherDashboardReadModel;
  linkRepository: TeacherStudentLinkRepository;
  clock: Clock;
  /**
   * Registers the NODE_ENV=test-only route E2E uses to create teachers and links. Set only by the
   * E2E composition (test-dependencies.ts); the route also refuses to exist outside NODE_ENV=test.
   */
  enableTestSupportRoutes?: boolean;
  close: () => Promise<void>;
}

export function buildTeachingDependencies(
  db: TeachingDb,
  close: () => Promise<void>,
): TeachingDependencies {
  return {
    readModel: new DrizzleTeacherDashboardReadModel(db),
    linkRepository: new DrizzleTeacherStudentLinkRepository(db),
    clock: new SystemClock(),
    close,
  };
}

/** The real, production adapter — Drizzle/Postgres over `DATABASE_URL`. */
export function createTeachingDependencies(databaseUrl: string): TeachingDependencies {
  const { db, close } = createTeachingDb(databaseUrl);
  return buildTeachingDependencies(db, close);
}
