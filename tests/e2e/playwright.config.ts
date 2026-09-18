import path from "node:path";
import { fileURLToPath } from "node:url";

import { defineConfig, devices } from "@playwright/test";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const baseURL = "http://localhost:5173";

const API_PORT = 3000;

/**
 * ~20% of the suite by design (see docs/testing/testing-strategy.md) —
 * cross-layer golden paths only. M3 adds the auth golden paths (register,
 * login, logout, password reset, route protection) — see
 * .claude/skills/playwright and docs/adr/adr-006-authentication.md.
 */
export default defineConfig({
  testDir: ".",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // CI-only JUnit output for Jenkins' native `junit` step; HTML report always generated.
  // outputFile is resolved relative to this config file's directory (tests/e2e/), not the
  // process cwd, so it's anchored to repoRoot explicitly — otherwise it lands at
  // tests/e2e/test-results/e2e-junit.xml, which the Jenkinsfile's `junit` step (looking at
  // $WORKSPACE/test-results/e2e-junit.xml) never finds.
  reporter: process.env.CI
    ? [
        ["html", { open: "never" }],
        ["junit", { outputFile: path.join(repoRoot, "test-results/e2e-junit.xml") }],
      ]
    : [["html", { open: "never" }]],
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: [
    {
      // NODE_ENV=test: apps/api runs against an in-process PGlite instance
      // instead of a live Postgres connection (see
      // docs/adr/adr-005-database.md and
      // apps/api/src/composition/auth-dependencies.ts) — real server, real
      // HTTP, real (WASM) Postgres, no Docker/network database needed for
      // E2E. AUTH_SESSION_SECRET is a throwaway value, fine to commit —
      // it only signs ephemeral E2E session cookies, never a real secret.
      command: "pnpm --filter @tfm-bic/api start",
      cwd: repoRoot,
      url: `http://localhost:${API_PORT}/health`,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
      env: {
        NODE_ENV: "test",
        PORT: String(API_PORT),
        APP_BASE_URL: baseURL,
        AUTH_SESSION_SECRET: "e2e-test-secret-never-used-outside-local-e2e-runs",
        // A full E2E run legitimately registers/logs in many times against
        // one shared server — see packages/config's load-env.ts for why
        // this is a distinct signal from NODE_ENV=test, not a weakening of
        // the real limits (still exercised by their own fixed-config unit
        // test regardless of this flag).
        E2E_RELAXED_RATE_LIMITS: "true",
      },
    },
    {
      command: "pnpm --filter @tfm-bic/web dev",
      cwd: repoRoot,
      url: baseURL,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
  ],
});
