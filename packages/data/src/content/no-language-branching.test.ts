import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { DEFAULT_CONTENT_ROOT } from "./content-root.js";

/**
 * Architecture guard for ADR-018: content is data, application code is
 * generic. This scans the *production* source of every layer and fails if any
 * of it branches on a language code or names a specific language. Language
 * identity may appear in content files, configuration defaults and tests — not
 * in behaviour. A hit here means a per-language code path is being introduced;
 * the fix is to move the difference into the catalog data, not to edit this test.
 */
const REPO_ROOT = path.resolve(DEFAULT_CONTENT_ROOT, "..");
const SOURCE_ROOTS = [
  "apps/web/src",
  "apps/api/src",
  "packages/domain/src",
  "packages/application/src",
  "packages/contracts/src",
  "packages/data/src",
  "packages/ui/src",
];

const FORBIDDEN: { name: string; pattern: RegExp }[] = [
  {
    name: "comparison of a language identifier with a literal code",
    pattern:
      /\b(?:language|languageId|languageCode|lang|locale|code)\s*[!=]==?\s*["'`][a-z]{2,3}(?:-[A-Za-z]+)?["'`]/,
  },
  { name: "switch case on a language code", pattern: /\bcase\s+["'`][a-z]{2}["'`]\s*:/ },
  {
    name: "a specific language's name in code",
    pattern: /\b(?:Polish|polski|English|Spanish|German|French|Italian|Portuguese)\b/,
  },
  {
    name: "a per-language class, component or function name",
    pattern:
      /\b(?:[Pp]olish|[Ee]nglish|[Ss]panish|[Gg]erman|[Ff]rench|[Ii]talian|[Pp]ortuguese)[A-Z]\w*|\b[a-z]+(?:Polish|English|Spanish|German|French|Italian|Portuguese)\b/,
  },
];

async function sourceFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const full = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        return entry.name === "node_modules" || entry.name === "test-support"
          ? []
          : sourceFiles(full);
      }
      const isSource = /\.(?:ts|tsx)$/.test(entry.name) && !/\.test\.(?:ts|tsx)$/.test(entry.name);
      return isSource && entry.name !== "testing.ts" ? [full] : [];
    }),
  );
  return nested.flat();
}

/** Comments may legitimately mention a language as an example. */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`])\/\/.*$/gm, "$1");
}

describe("no language-specific application logic", () => {
  it("finds the source it is meant to guard (the guard itself is not vacuous)", async () => {
    const all = (
      await Promise.all(SOURCE_ROOTS.map((r) => sourceFiles(path.join(REPO_ROOT, r))))
    ).flat();

    expect(all.length).toBeGreaterThan(100);
    expect(all.some((f) => f.endsWith(path.join("routes", "content.route.ts")))).toBe(true);
  });

  it.each(FORBIDDEN)("production code has no $name", async ({ pattern }) => {
    const offenders: string[] = [];
    for (const root of SOURCE_ROOTS) {
      for (const file of await sourceFiles(path.join(REPO_ROOT, root))) {
        const code = stripComments(await readFile(file, "utf8"));
        const hit = pattern.exec(code);
        if (hit) {
          offenders.push(`${path.relative(REPO_ROOT, file)}: ${hit[0]}`);
        }
      }
    }

    expect(offenders).toEqual([]);
  });

  it("the guard does catch the patterns it exists to forbid", () => {
    const bad = [
      'if (language === "pl") {',
      "if (languageCode !== 'en') {",
      'case "es":',
      "return <PolishLesson />;",
      "class EnglishLessonsService {}",
      "const polishLessons = [];",
      'const label = "Polish";',
    ];
    for (const line of bad) {
      expect(
        FORBIDDEN.some(({ pattern }) => pattern.test(line)),
        line,
      ).toBe(true);
    }
    expect(FORBIDDEN.some(({ pattern }) => pattern.test("loadLessons(languageId, levelId)"))).toBe(
      false,
    );
  });
});
