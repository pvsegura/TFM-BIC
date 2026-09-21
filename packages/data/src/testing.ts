/**
 * Test-only exports — real (WASM-compiled) Postgres instances with the
 * migrations applied, no Docker/network dependency. Used by:
 * - packages/data's own repository tests (colocated, via a relative
 *   import — this subpath exists for OTHER packages, e.g. apps/api's
 *   NODE_ENV=test composition, see apps/api/src/composition/).
 * Never import this from production code.
 */
export { createTestDb, type TestDbHandle } from "./identity/db/test-support/create-test-db.js";
export {
  createProfileTestDb,
  type ProfileTestDbHandle,
} from "./profile/db/test-support/create-test-db.js";
export {
  createLessonsTestDb,
  type LessonsTestDbHandle,
} from "./lessons/db/test-support/create-test-db.js";
