import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

import "@testing-library/jest-dom/vitest";

// vitest.shared.ts sets `globals: false`, so RTL's automatic cleanup (which
// detects a global `afterEach`) never registers itself — wire it up
// explicitly, otherwise DOM trees accumulate across tests in the same file.
afterEach(() => {
  cleanup();
});
