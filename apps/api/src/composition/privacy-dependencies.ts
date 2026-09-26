import type { AccountErasureStore, PersonalDataReadModel } from "@tfm-bic/application";
import {
  createPrivacyDb,
  DrizzleAccountErasureStore,
  SqlPersonalDataReadModel,
  type PrivacyDb,
} from "@tfm-bic/data";

/**
 * Privacy & Data Management (M15, ADR-026): the export read model and the account-erasure store.
 * Composition-root wiring only — excluded from coverage like the other *-dependencies.ts files.
 */
export interface PrivacyDependencies {
  readModel: PersonalDataReadModel;
  erasureStore: AccountErasureStore;
  close: () => Promise<void>;
}

/** The real adapters over a database handle (shared by production and the NODE_ENV=test PGlite). */
export function buildPrivacyDependencies(
  db: PrivacyDb,
  close: () => Promise<void>,
): PrivacyDependencies {
  return {
    readModel: new SqlPersonalDataReadModel(db),
    erasureStore: new DrizzleAccountErasureStore(db),
    close,
  };
}

/** The real adapters over a live Postgres `DATABASE_URL` (a small pool of its own). */
export function createPrivacyDependencies(databaseUrl: string): PrivacyDependencies {
  const { db, close } = createPrivacyDb(databaseUrl);
  return buildPrivacyDependencies(db, close);
}
