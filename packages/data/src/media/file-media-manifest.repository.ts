import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

import type { MediaManifestEntry, MediaManifestRepository } from "@tfm-bic/application";

interface ManifestFile {
  schemaVersion: 1;
  entries: MediaManifestEntry[];
}

/**
 * The media manifest (M21, ADR-031): one JSON file, `content/media/manifest.json`, committed with
 * the media it describes. It is the durable record of the pipeline's state per content item and
 * the index the API serves from. Entries are sorted by key so a regeneration produces a small,
 * reviewable diff. Written atomically (temp file + rename).
 */
export class FileMediaManifestRepository implements MediaManifestRepository {
  private readonly file: string;

  constructor(mediaRoot: string) {
    this.file = path.join(mediaRoot, "manifest.json");
  }

  private async read(): Promise<ManifestFile> {
    try {
      const parsed = JSON.parse(await readFile(this.file, "utf8")) as ManifestFile;
      return parsed;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT")
        return { schemaVersion: 1, entries: [] };
      throw error;
    }
  }

  async get(key: string): Promise<MediaManifestEntry | undefined> {
    return (await this.read()).entries.find((entry) => entry.key === key);
  }

  async list(): Promise<MediaManifestEntry[]> {
    return (await this.read()).entries;
  }

  async put(entry: MediaManifestEntry): Promise<void> {
    const manifest = await this.read();
    const entries = manifest.entries.filter((e) => e.key !== entry.key);
    entries.push(entry);
    entries.sort((a, b) => a.key.localeCompare(b.key));
    await mkdir(path.dirname(this.file), { recursive: true });
    const temp = `${this.file}.tmp`;
    await writeFile(temp, `${JSON.stringify({ schemaVersion: 1, entries }, null, 2)}\n`, "utf8");
    await rename(temp, this.file);
  }
}
