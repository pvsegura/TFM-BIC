import { readFile } from "node:fs/promises";
import path from "node:path";

import type { BookIndex, BookIndexRepository } from "@verbysia/application";
import { bookIndexSchema, COURSE_PATTERN } from "@verbysia/contracts";

/**
 * Reads `<content>/books/{course}.json` on first use and keeps it in memory. The course is
 * checked against a strict pattern before it becomes a file name, so a request can never name
 * another path. A missing or invalid file is "no book yet", never a server error.
 */
export class FileBookIndexRepository implements BookIndexRepository {
  private readonly cache = new Map<string, BookIndex | null>();

  constructor(private readonly booksDir: string) {}

  async find(course: string): Promise<BookIndex | null> {
    if (!COURSE_PATTERN.test(course)) return null;
    const cached = this.cache.get(course);
    if (cached !== undefined) return cached;
    let index: BookIndex | null;
    try {
      const raw: unknown = JSON.parse(
        await readFile(path.join(this.booksDir, `${course}.json`), "utf8"),
      );
      const parsed = bookIndexSchema.safeParse(raw);
      index = parsed.success && parsed.data.course === course ? parsed.data : null;
    } catch {
      index = null;
    }
    this.cache.set(course, index);
    return index;
  }
}
