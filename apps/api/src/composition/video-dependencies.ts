import path from "node:path";

import type {
  Clock,
  VideoGenerationJobRepository,
  VideoGenerationService,
} from "@tfm-bic/application";
import type { AppEnv } from "@tfm-bic/config";
import {
  createVideoDb,
  DEFAULT_CONTENT_ROOT,
  DrizzleVideoGenerationJobRepository,
  FakeVideoGenerationService,
  HyperframesCliProvider,
  SystemClock,
  type VideoDb,
} from "@tfm-bic/data";

/**
 * Everything the video-generation routes need beyond the content dependencies (video definitions
 * are the M11 files, reached through `ContentDependencies`): the job store, the clock, and the
 * provider (ADR-011/012). One bag so `server.ts` doesn't hand-wire constructors and tests can
 * substitute fakes (see apps/api/src/test-support/build-test-deps.ts). Composition-root wiring
 * only, so it is excluded from coverage like phonetics-dependencies.ts (see vitest.config.ts).
 */
export interface VideoDependencies {
  videoGenerationJobRepository: VideoGenerationJobRepository;
  provider: VideoGenerationService;
  clock: Clock;
  /** Release any held resources (e.g. the Postgres connection pool). */
  close: () => Promise<void>;
}

/**
 * Selects the provider from `env.VIDEO_GENERATION_PROVIDER`: `"fake"` (the default — a real,
 * committed adapter, never Hyperframes) everywhere except a deliberately configured
 * `"hyperframes"` run. Never selected by tests or CI (see ADR-012 and
 * `content/video-scripts/README.md` for why the real adapter is implemented but unverified).
 */
export function selectVideoGenerationProvider(
  env: Pick<AppEnv, "VIDEO_GENERATION_PROVIDER" | "CONTENT_DIR">,
): VideoGenerationService {
  if (env.VIDEO_GENERATION_PROVIDER === "hyperframes") {
    const contentDir = env.CONTENT_DIR ?? DEFAULT_CONTENT_ROOT;
    return new HyperframesCliProvider({ videoScriptsRoot: path.join(contentDir, "video-scripts") });
  }
  return new FakeVideoGenerationService();
}

export function buildVideoDependencies(
  db: VideoDb,
  provider: VideoGenerationService,
  close: () => Promise<void>,
): VideoDependencies {
  return {
    videoGenerationJobRepository: new DrizzleVideoGenerationJobRepository(db),
    provider,
    clock: new SystemClock(),
    close,
  };
}

/** The real, production adapters — Drizzle/Postgres over `DATABASE_URL`, and whichever
 * `VideoGenerationService` `env.VIDEO_GENERATION_PROVIDER` selects. */
export function createVideoDependencies(databaseUrl: string, env: AppEnv): VideoDependencies {
  const { db, close } = createVideoDb(databaseUrl);
  return buildVideoDependencies(db, selectVideoGenerationProvider(env), close);
}
