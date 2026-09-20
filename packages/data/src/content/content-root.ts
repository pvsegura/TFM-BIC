import { fileURLToPath } from "node:url";

/**
 * The repository's `content/` folder — the canonical, version-controlled
 * source of all languages and educational content (ADR-018). Resolved from
 * this file's location, so it works from any working directory; deployments
 * that keep content elsewhere pass `CONTENT_DIR` instead (see apps/api).
 */
export const DEFAULT_CONTENT_ROOT = fileURLToPath(new URL("../../../../content", import.meta.url));
