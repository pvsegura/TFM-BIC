import { defineProjectConfig } from "../../vitest.shared.js";

export default defineProjectConfig({
  name: "web",
  environment: "jsdom",
  setupFiles: ["./src/test-setup.ts"],
});
