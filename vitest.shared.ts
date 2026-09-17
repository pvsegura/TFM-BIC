import type { ViteUserConfig } from "vitest/config";

interface ProjectOptions {
  name: string;
  environment?: "node" | "jsdom";
  setupFiles?: string[];
  /** Override for slow hooks (e.g. booting a PGlite instance under
   * concurrent load) — default Vitest hook/test timeouts (10s) are tight
   * for that; see packages/data/vitest.config.ts. */
  hookTimeout?: number;
  testTimeout?: number;
  /** false: run this project's test files sequentially rather than in
   * parallel worker forks. Needed for packages/data's PGlite-backed tests
   * — several concurrent in-process WASM Postgres instances crashed
   * Vitest's worker forks on this stack; see packages/data/vitest.config.ts. */
  fileParallelism?: boolean;
}

/**
 * Shared per-package Vitest project config. Kept as a plain helper (not a
 * workspace package) since it is build tooling, not runtime code consumed
 * by the app — importing it does not cross the domain/application/data
 * layering boundaries described in docs/architecture/.
 */
export function defineProjectConfig({
  name,
  environment = "node",
  setupFiles = [],
  hookTimeout,
  testTimeout,
  fileParallelism,
}: ProjectOptions): ViteUserConfig {
  return {
    test: {
      name,
      environment,
      setupFiles,
      globals: false,
      include: ["src/**/*.test.{ts,tsx}"],
      restoreMocks: true,
      // Only set when provided — with `exactOptionalPropertyTypes`,
      // assigning `undefined` to these optional keys is a type error, so
      // they must be omitted entirely rather than set to `undefined`.
      ...(hookTimeout !== undefined && { hookTimeout }),
      ...(testTimeout !== undefined && { testTimeout }),
      ...(fileParallelism !== undefined && { fileParallelism }),
    },
  };
}
