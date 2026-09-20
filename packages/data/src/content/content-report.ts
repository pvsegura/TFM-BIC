import { isPublished } from "@tfm-bic/domain";

import type { LoadContentResult } from "./load-content-catalog.js";

export interface ContentReport {
  text: string;
  exitCode: 0 | 1;
}

function plural(count: number, noun: string): string {
  return `${String(count)} ${noun}${count === 1 ? "" : "s"}`;
}

/** Human-readable outcome of validating the content tree, for `pnpm content:validate`. */
export function formatContentReport(result: LoadContentResult): ContentReport {
  if (result.ok) {
    const { languages, content } = result.catalog;
    const published = content.filter(isPublished).length;
    return {
      exitCode: 0,
      text: `Content is valid: ${plural(languages.length, "language")}, ${plural(content.length, "content item")} (${String(published)} published).`,
    };
  }

  const lines = result.issues.map((issue) => `  - ${issue.location}: ${issue.message}`);
  return {
    exitCode: 1,
    text: `Content is invalid: ${plural(result.issues.length, "problem")}.\n${lines.join("\n")}`,
  };
}
