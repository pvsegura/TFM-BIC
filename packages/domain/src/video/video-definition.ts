import type { ContentStatus } from "../content/content-status.js";
import type { LanguageId } from "../language/language-id.js";
import type { LevelId } from "../language/level-id.js";
import type { VideoDefinitionId } from "./video-definition-id.js";

/**
 * One educational video: what should be generated, described in a way no provider owns. The
 * actual render project (Hyperframes' HTML/timeline, or any future provider's own format) lives
 * under `content/video-scripts/<scriptPath>` — this type never parses or depends on its contents,
 * only holds a pointer to it, so swapping providers later only changes the adapter that reads
 * `scriptPath`, never this content model.
 *
 * `relatedContentId` optionally reuses an existing lesson, vocabulary or phonetic id (M5/M6/M9/
 * M10) to anchor the video to content the platform already has, instead of duplicating it. It is
 * free text in this milestone — not cross-validated against those catalogs — since the video
 * content model is deliberately the smallest one that supports the first vertical slice.
 */
export interface VideoDefinition {
  id: VideoDefinitionId;
  languageId: LanguageId;
  levelId: LevelId;
  status: ContentStatus;
  /** Position within its language and level; unique there, gaps allowed. */
  order: number;
  /** The language `title` and `description` are written in. */
  instructionLanguage: LanguageId;
  title: string;
  description: string;
  relatedContentId?: string | undefined;
  /** Path, relative to `content/video-scripts/`, to the provider-specific render project. */
  scriptPath: string;
}
