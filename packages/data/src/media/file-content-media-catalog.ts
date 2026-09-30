import { readFileSync, statSync } from "node:fs";
import path from "node:path";

import type { ContentMediaCatalog, MediaManifestEntry } from "@tfm-bic/application";
import { mediaContentKey, type ContentMedia, type MediaContentRef } from "@tfm-bic/domain";

/** The URL prefix published media files are served under (same origin as the app). */
export const MEDIA_FILES_URL_PREFIX = "/media/files/";

const CONTENT_TYPES: Record<string, string> = {
  ".mp4": "video/mp4",
  ".m4a": "audio/mp4",
  ".jpg": "image/jpeg",
  ".vtt": "text/vtt; charset=utf-8",
};

export interface ServableMediaFile {
  absolutePath: string;
  contentType: string;
  size: number;
}

/**
 * The published-media read side for the API (M21, ADR-031), loaded once at start-up from
 * `<mediaRoot>/manifest.json`. Only entries with a published asset are exposed, and only files
 * those assets reference become servable: the file route looks a request up in this allowlist and
 * never builds a filesystem path from the URL. A missing manifest means "no media yet", not an
 * error. A listed file that is missing on disk is left out (and the asset with it), so the page
 * shows "coming soon" instead of a broken player.
 */
export class FileContentMediaCatalog implements ContentMediaCatalog {
  private readonly byKey = new Map<string, ContentMedia>();
  readonly files = new Map<string, ServableMediaFile>();

  constructor(mediaRoot: string) {
    let entries: MediaManifestEntry[] = [];
    try {
      entries = (
        JSON.parse(readFileSync(path.join(mediaRoot, "manifest.json"), "utf8")) as {
          entries: MediaManifestEntry[];
        }
      ).entries;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }

    const root = path.resolve(mediaRoot);
    const publish = (relative: string): string | undefined => {
      const absolutePath = path.resolve(root, relative);
      const contentType = CONTENT_TYPES[path.extname(relative).toLowerCase()];
      if (!contentType || !absolutePath.startsWith(root + path.sep)) return undefined;
      try {
        const size = statSync(absolutePath).size;
        this.files.set(relative, { absolutePath, contentType, size });
        return `${MEDIA_FILES_URL_PREFIX}${relative.split("/").map(encodeURIComponent).join("/")}`;
      } catch {
        return undefined;
      }
    };

    for (const entry of entries) {
      if (!entry.published) continue;
      const media: ContentMedia = { content: entry.content, audio: [] };
      const video = entry.published.video;
      if (video) {
        const url = publish(video.url);
        const posterUrl = publish(video.posterUrl);
        const captionsUrl = publish(video.captionsUrl);
        if (url && posterUrl && captionsUrl)
          media.video = { ...video, url, posterUrl, captionsUrl };
      }
      for (const clip of entry.published.audio) {
        const url = publish(clip.url);
        if (url) media.audio.push({ ...clip, url });
      }
      if (media.video || media.audio.length > 0) this.byKey.set(entry.key, media);
    }
  }

  find(ref: Pick<MediaContentRef, "type" | "id">): ContentMedia | undefined {
    return this.byKey.get(mediaContentKey(ref));
  }

  list(): ContentMedia[] {
    return [...this.byKey.values()];
  }
}
