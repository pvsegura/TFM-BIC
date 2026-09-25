/**
 * Test-only exports: builders for well-formed exercises, shared by the other
 * packages' tests. A separate subpath so production code cannot import them by
 * accident. Never import this from production code.
 */
export * from "./exercise/test-support/exercise-fixtures.js";
export * from "./phonetics/test-support/phonetics-fixtures.js";
export * from "./video/test-support/video-fixtures.js";
export * from "./vocabulary/test-support/vocabulary-fixtures.js";
