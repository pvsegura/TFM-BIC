/**
 * Test-only exports: builders for well-formed exercises, shared by the other
 * packages' tests. A separate subpath so production code cannot import them by
 * accident. Never import this from production code.
 */
export * from "./exercise/test-support/exercise-fixtures.js";
