import { defineProjectConfig } from "../../vitest.shared.js";

export default defineProjectConfig({
  name: "ui",
  environment: "jsdom",
  setupFiles: ["./src/test-setup.ts"],
});
