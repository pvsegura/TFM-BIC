/**
 * Test-only exports — a real (WASM-compiled) Postgres instance with M3's
 * migrations applied, no Docker/network dependency. Used by:
 * - packages/data's own repository tests (colocated, via a relative
 *   import — this subpath exists for OTHER packages, e.g. apps/api's
 *   NODE_ENV=test composition, see apps/api/src/composition/
 *   auth-dependencies.ts).
 * Never import this from production code.
 */
export { createTestDb, type TestDbHandle } from "./identity/db/test-support/create-test-db.js";
