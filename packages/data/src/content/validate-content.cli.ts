import { formatContentReport } from "./content-report.js";
import { DEFAULT_CONTENT_ROOT } from "./content-root.js";
import { loadContentCatalog } from "./load-content-catalog.js";

/**
 * `pnpm content:validate [contentRoot]` — validates every content file, and
 * the catalog as a whole, with the exact loader the API uses at startup.
 * Bootstrap only (argv in, exit code out): the logic it calls is unit-tested,
 * so this file is excluded from coverage like the other entry points.
 */
const contentRoot = process.argv[2] ?? DEFAULT_CONTENT_ROOT;
const report = formatContentReport(await loadContentCatalog(contentRoot));

(report.exitCode === 0 ? process.stdout : process.stderr).write(`${report.text}\n`);
process.exitCode = report.exitCode;
