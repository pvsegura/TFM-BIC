import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { FileBookIndexRepository } from "./file-book-index.repository.js";

async function dirWith(files: Record<string, unknown>): Promise<string> {
  const dir = await mkdtemp(path.join(tmpdir(), "books-"));
  for (const [name, body] of Object.entries(files)) {
    await writeFile(path.join(dir, name), typeof body === "string" ? body : JSON.stringify(body));
  }
  return dir;
}

const valid = {
  course: "es-a1",
  podrecznik: { pages: 180, index: { "unit:3": 24, "lesson:es-unit-3-places": 25 } },
  zeszyt: { pages: 170, index: { "exercise:3.14": 30 } },
};

describe("FileBookIndexRepository", () => {
  it("reads a course's page index", async () => {
    const repo = new FileBookIndexRepository(await dirWith({ "es-a1.json": valid }));
    await expect(repo.find("es-a1")).resolves.toEqual(valid);
  });

  it("treats a missing, invalid or mismatched file as no book", async () => {
    const repo = new FileBookIndexRepository(
      await dirWith({
        "es-a2.json": "{not json",
        "es-b1.json": { ...valid, course: "es-b2" },
        "es-c1.json": { course: "es-c1", zeszyt: { pages: 10, index: { "../x": 1 } } },
      }),
    );
    await expect(repo.find("es-a2")).resolves.toBeNull();
    await expect(repo.find("es-b1")).resolves.toBeNull();
    await expect(repo.find("es-c1")).resolves.toBeNull();
    await expect(repo.find("es-c2")).resolves.toBeNull();
  });

  it("never turns a malformed course into a file path", async () => {
    const repo = new FileBookIndexRepository(await dirWith({ "es-a1.json": valid }));
    await expect(repo.find("../es-a1")).resolves.toBeNull();
    await expect(repo.find("es-a1.json")).resolves.toBeNull();
  });
});
