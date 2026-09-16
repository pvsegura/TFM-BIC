import path from "node:path";
import { fileURLToPath } from "node:url";

import { defineConfig, devices } from "@playwright/test";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const baseURL = "http://localhost:5173";

/**
 * ~20% of the suite by design (see docs/testing/testing-strategy.md) —
 * cross-layer golden paths only. M1 has no golden path yet (no auth, no
 * lessons), so the only test here is a smoke test proving the app boots and
 * is reachable — see .claude/skills/playwright.
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
  webServer: {
    command: "pnpm --filter @tfm-bic/web dev",
    cwd: repoRoot,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
