import type { LanguageId } from "../language/language-id.js";

/**
 * Educational media (M21, ADR-031): what a lesson or a vocabulary item is explained *with*. Nothing
 * here names a provider, a voice or a storage location scheme — an asset only says what it is, for
 * which content, and where the file can be fetched from. Provider details live in the generation
 * pipeline's own records, never in these types.
 */

/** The kinds of content that can own media. A discriminator, not a lookup: ids stay per-kind. */
export const MEDIA_CONTENT_TYPES = ["lesson", "vocabulary-item"] as const;
export type MediaContentType = (typeof MEDIA_CONTENT_TYPES)[number];

export function isMediaContentType(value: string): value is MediaContentType {
  return (MEDIA_CONTENT_TYPES as readonly string[]).includes(value);
}

export interface MediaContentRef {
  type: MediaContentType;
  /** The lesson/content id or vocabulary item id, exactly as in the content catalog. */
  id: string;
  languageId: LanguageId;
}

/** A stable key for one content item, used for idempotency and indexing. */
export function mediaContentKey(ref: Pick<MediaContentRef, "type" | "id">): string {
  return `${ref.type}:${ref.id}`;
}

/** Which job a video does. One explanation video per content item for now. */
export type VideoPurpose = "lesson-explanation" | "vocabulary-explanation";

/** Which job an audio clip does. */
export type AudioPurpose = "pronunciation" | "example-pronunciation";

export interface VideoAsset {
  purpose: VideoPurpose;
  /** Same-origin URL path of the MP4 file. */
  url: string;
  posterUrl: string;
  captionsUrl: string;
  /** Language of the captions track (the narration's instruction language). */
  captionsLanguage: LanguageId;
  durationSeconds: number;
  width: number;
  height: number;
  /** The narrator's display name (a character label, not a claim about a real person). */
  narrator: string;
  /** Plain-text transcript, in playback order. */
  transcript: TranscriptLine[];
}

export interface TranscriptLine {
  text: string;
  /** Language the line is spoken or shown in. */
  language: LanguageId;
  /** A translation shown alongside, when the line is in the language being learned. */
  translation?: string | undefined;
}

export interface AudioAsset {
  purpose: AudioPurpose;
  url: string;
  durationSeconds: number;
  /** The exact text spoken, so the page never has to guess what the clip says. */
  text: string;
  language: LanguageId;
  narrator: string;
}

/** Everything published for one content item. Absent keys mean "not generated yet". */
export interface ContentMedia {
  content: MediaContentRef;
  video?: VideoAsset | undefined;
  audio: AudioAsset[];
}
