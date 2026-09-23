/**
 * Test-only exports (in-memory fakes for the Identity and Student Profile
 * ports) — a separate
 * subpath so `apps/api` can build fast, fake-backed HTTP-layer tests
 * without depending on this package's internal file layout. Never import
 * this from production code.
 */
export * from "./identity/test-support/fakes.js";
export * from "./profile/test-support/fakes.js";
export * from "./content/test-support/fakes.js";
export * from "./lesson/test-support/fakes.js";
export * from "./exercise/test-support/fakes.js";
export * from "./gamification/test-support/fakes.js";
export * from "./vocabulary/test-support/fakes.js";
export * from "./phonetics/test-support/fakes.js";
