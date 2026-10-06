import type { AiAgentService, LearnerInsightsReadModel } from "@tfm-bic/application";
import type { AppEnv } from "@tfm-bic/config";
import {
  createCoachDb,
  DisabledAiAgentService,
  DrizzleLearnerInsightsReadModel,
  FakeAiAgentService,
  GeminiAgentProvider,
  type CoachDb,
} from "@tfm-bic/data";

/**
 * The AI Learning Coach's dependencies (M23, ADR-034): the agent provider and the learner read
 * model. Composition-root wiring only.
 *
 * The coach owns no table, so this creates no migration and registers nothing in the privacy
 * register — it only reads M6/M7/M8/M9 rows for the session's own user.
 */
export interface CoachDependencies {
  agent: AiAgentService;
  insights: LearnerInsightsReadModel;
  /** `false` when the deployment switched the coach off; the route then answers 503. */
  enabled: boolean;
  close: () => Promise<void>;
}

/**
 * Selects the provider from `env.AI_COACH_PROVIDER`: `"fake"` (the default — a committed adapter
 * that never calls Gemini) everywhere except a deliberately configured `"gemini"` run, which
 * `loadEnv` refuses under NODE_ENV=test and without a key. The model name and the key are read
 * here and nowhere else.
 *
 * `GEMINI_AGENT_API_KEY` wins over `GEMINI_API_KEY` so a deployment can keep learner traffic off
 * the offline media pipeline's daily quota (ADR-034, decision 8).
 */
export function selectAiAgentService(
  env: Pick<
    AppEnv,
    "AI_COACH_PROVIDER" | "AI_COACH_MODEL" | "GEMINI_AGENT_API_KEY" | "GEMINI_API_KEY"
  >,
): AiAgentService {
  switch (env.AI_COACH_PROVIDER) {
    case "gemini":
      return new GeminiAgentProvider({
        apiKey: env.GEMINI_AGENT_API_KEY ?? env.GEMINI_API_KEY ?? "",
        model: env.AI_COACH_MODEL,
      });
    case "disabled":
      return new DisabledAiAgentService();
    case "fake":
      return new FakeAiAgentService();
  }
}

/** The real adapters over a database handle (shared by production and the NODE_ENV=test PGlite). */
export function buildCoachDependencies(
  env: AppEnv,
  db: CoachDb,
  close: () => Promise<void>,
): CoachDependencies {
  return {
    agent: selectAiAgentService(env),
    insights: new DrizzleLearnerInsightsReadModel(db),
    enabled: env.AI_COACH_PROVIDER !== "disabled",
    close,
  };
}

/** The real adapters over a live Postgres `DATABASE_URL` (the shared process pool). */
export function createCoachDependencies(env: AppEnv, databaseUrl: string): CoachDependencies {
  const { db, close } = createCoachDb(databaseUrl);
  return buildCoachDependencies(env, db, close);
}
