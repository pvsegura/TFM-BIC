import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { MIGRATION_TABLES } from "./migration-tables.js";

const packageRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

/** Each context's own drizzle-kit config, e.g. drizzle.lessons.config.ts → "lessons". */
const configs = readdirSync(packageRoot)
  .map((file) => /^drizzle\.([a-z]+)\.config\.ts$/.exec(file))
  .filter((match): match is RegExpExecArray => match !== null)
  .map((match) => ({ context: match[1]!, file: path.join(packageRoot, match[0]) }));

describe("MIGRATION_TABLES", () => {
  it("names every context that has its own drizzle-kit config", () => {
    expect(configs.length).toBeGreaterThan(0);
    expect(Object.keys(MIGRATION_TABLES).sort()).toEqual(configs.map((c) => c.context).sort());
  });

  it.each(configs)(
    "matches migrations.table in drizzle.$context.config.ts",
    ({ context, file }) => {
      const table = /migrations:\s*\{\s*table:\s*"([^"]+)"/.exec(readFileSync(file, "utf8"))?.[1];

      expect(table).toBe(MIGRATION_TABLES[context as keyof typeof MIGRATION_TABLES]);
    },
  );
});
