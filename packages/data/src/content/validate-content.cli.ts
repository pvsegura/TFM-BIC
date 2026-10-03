import { formatContentReport } from "./content-report.js";
import { DEFAULT_CONTENT_ROOT } from "./content-root.js";
import { loadContentCatalog } from "./load-content-catalog.js";
import { loadGrammarReference } from "./load-grammar-reference.js";

/**
 * `pnpm content:validate [contentRoot]` — validates every content file, and
 * the catalog as a whole, with the exact loader the API uses at startup.
 * Bootstrap only (argv in, exit code out): the logic it calls is unit-tested,
 * so this file is excluded from coverage like the other entry points.
 */
const contentRoot = process.argv[2] ?? DEFAULT_CONTENT_ROOT;
const result = await loadContentCatalog(contentRoot);
const report = formatContentReport(result);
let { exitCode, text } = report;
// The grammar reference (M23) is checked against the catalog, so only once the catalog is valid.
if (result.ok) {
  const grammar = await loadGrammarReference(contentRoot, result.catalog);
  if (grammar.ok) {
    text += `\nGrammar reference is valid: ${String(grammar.topics.length)} topics.`;
  } else {
    exitCode = 1;
    text += `\nGrammar reference has ${String(grammar.issues.length)} problem(s):\n${grammar.issues
      .map((issue) => `  ${issue.location}: ${issue.message}`)
      .join("\n")}`;
  }
}

(exitCode === 0 ? process.stdout : process.stderr).write(`${text}\n`);
process.exitCode = exitCode;
