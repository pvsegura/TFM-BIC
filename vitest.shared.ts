import type { ViteUserConfig } from "vitest/config";

interface ProjectOptions {
  name: string;
  environment?: "node" | "jsdom";
  setupFiles?: string[];
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
}: ProjectOptions): ViteUserConfig {
  return {
    test: {
      name,
      environment,
      setupFiles,
      globals: false,
      include: ["src/**/*.test.{ts,tsx}"],
      restoreMocks: true,
    },
  };
}
