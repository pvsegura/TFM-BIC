import {
  AchievementTexts,
  DEFAULT_ACHIEVEMENT_TEXT_CATALOG,
  DEFAULT_INTERFACE_LOCALE,
  type Clock,
  type GamificationRepository,
} from "@tfm-bic/application";
import {
  createGamificationDb,
  DrizzleGamificationRepository,
  SystemClock,
  type GamificationDb,
} from "@tfm-bic/data";
import { createDefaultAchievementRegistry, type AchievementRegistry } from "@tfm-bic/domain";

/**
 * Everything the gamification use cases need: the ledger store, the achievement rules, the words
 * that go with them, and the clock that stamps every reward. One bag so `server.ts` doesn't
 * hand-wire constructors and tests can substitute fakes (see
 * apps/api/src/test-support/build-test-deps.ts). Composition-root wiring only, so it is excluded
 * from coverage like exercise-dependencies.ts (see vitest.config.ts).
 */
export interface GamificationDependencies {
  gamificationRepository: GamificationRepository;
  /** Only rules registered here can ever unlock; nothing in a request can add one. */
  achievementRegistry: AchievementRegistry;
  /** Validated against the registry at construction: an achievement without texts stops start-up. */
  achievementTexts: AchievementTexts;
  clock: Clock;
  /** Release any held resources (e.g. the Postgres connection pool). */
  close: () => Promise<void>;
}

export function buildGamificationDependencies(
  db: GamificationDb,
  close: () => Promise<void>,
): GamificationDependencies {
  const achievementRegistry = createDefaultAchievementRegistry();
  return {
    gamificationRepository: new DrizzleGamificationRepository(db),
    achievementRegistry,
    achievementTexts: new AchievementTexts(
      achievementRegistry,
      DEFAULT_ACHIEVEMENT_TEXT_CATALOG,
      DEFAULT_INTERFACE_LOCALE,
    ),
    clock: new SystemClock(),
    close,
  };
}

/** The real, production adapter — Drizzle/Postgres over `DATABASE_URL`. */
export function createGamificationDependencies(databaseUrl: string): GamificationDependencies {
  const { db, close } = createGamificationDb(databaseUrl);
  return buildGamificationDependencies(db, close);
}
