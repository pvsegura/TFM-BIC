import { defineProjectConfig } from "../../vitest.shared.js";

// jsdom tests and the source-scanning guard (`no-raw-html.test.ts`) get slow when nine projects
// run in parallel with coverage on a small machine; a few exceeded Vitest's 5 s default while
// passing alone. Same reasoning as the api and data projects.
export default defineProjectConfig({
  name: "web",
  environment: "jsdom",
  setupFiles: ["./src/test-setup.ts"],
  hookTimeout: 30000,
  testTimeout: 30000,
});
