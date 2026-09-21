import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

/**
 * Architecture guard for the content-safety rules (ADR-018, ADR-020): content —
 * lesson blocks, exercise prompts, options, feedback — is plain text rendered
 * through React's escaping into fixed components, never markup and never code.
 * This scans the *production* source of the web app and the UI primitives and
 * fails if any of it injects raw HTML or executes a string. A hit means an XSS
 * or code-execution path is being introduced; the fix is to render structured
 * text instead, not to edit this test.
 */
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOTS = [HERE, path.join(HERE, "..", "..", "..", "packages", "ui", "src")];

const FORBIDDEN: { name: string; pattern: RegExp }[] = [
  { name: "dangerouslySetInnerHTML", pattern: /dangerouslySetInnerHTML/ },
  { name: "an innerHTML / outerHTML assignment", pattern: /\.(?:inner|outer)HTML\b/ },
  { name: "insertAdjacentHTML", pattern: /insertAdjacentHTML/ },
  { name: "document.write", pattern: /document\.write(?:ln)?\s*\(/ },
  { name: "eval", pattern: /(?<![\w.])eval\s*\(/ },
  { name: "the Function constructor", pattern: /new\s+Function\s*\(/ },
  {
    name: "a string passed to setTimeout/setInterval",
    pattern: /set(?:Timeout|Interval)\s*\(\s*["'`]/,
  },
  { name: "a dynamic import of a computed path", pattern: /(?<![\w.])import\s*\(\s*[^"'`\s)]/ },
];

async function sourceFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const full = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        return entry.name === "node_modules" ? [] : sourceFiles(full);
      }
      const isSource = /\.(?:ts|tsx)$/.test(entry.name) && !/\.test\.(?:ts|tsx)$/.test(entry.name);
      return isSource ? [full] : [];
    }),
  );
  return nested.flat();
}

/** Comments may legitimately mention these names when explaining why they are avoided. */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`])\/\/.*$/gm, "$1");
}

describe("no raw HTML injection or code execution in the web app", () => {
  it("finds the source it is meant to guard (the guard itself is not vacuous)", async () => {
    const all = (await Promise.all(ROOTS.map(sourceFiles))).flat();

    expect(all.length).toBeGreaterThan(60);
    expect(all.some((file) => file.endsWith("exercise-player.tsx"))).toBe(true);
    expect(all.some((file) => file.endsWith("content-blocks.tsx"))).toBe(true);
    expect(all.some((file) => file.endsWith("button.tsx"))).toBe(true);
  });

  it.each(FORBIDDEN)("production code never uses $name", async ({ pattern }) => {
    const offenders: string[] = [];
    for (const file of (await Promise.all(ROOTS.map(sourceFiles))).flat()) {
      const code = stripComments(await readFile(file, "utf8"));
      const hit = pattern.exec(code);
      if (hit) {
        offenders.push(`${path.relative(HERE, file)}: ${hit[0]}`);
      }
    }

    expect(offenders).toEqual([]);
  });

  it("the guard does catch the patterns it exists to forbid", () => {
    const bad = [
      "<div dangerouslySetInnerHTML={{ __html: text }} />",
      "node.innerHTML = prompt;",
      "el.insertAdjacentHTML('beforeend', x);",
      "document.write(x);",
      "eval(exercise.configuration.code);",
      "const run = new Function('a', body);",
      "setTimeout('alert(1)', 10);",
      "const view = await import(exercise.type);",
    ];
    for (const line of bad) {
      expect(
        FORBIDDEN.some(({ pattern }) => pattern.test(line)),
        line,
      ).toBe(true);
    }
    expect(FORBIDDEN.some(({ pattern }) => pattern.test("const x = await import('./a.js');"))).toBe(
      false,
    );
    expect(FORBIDDEN.some(({ pattern }) => pattern.test("<p>{exercise.prompt}</p>"))).toBe(false);
  });
});
