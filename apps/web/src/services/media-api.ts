import {
  contentMediaResponseSchema,
  mediaIndexResponseSchema,
  type ContentMediaResponse,
  type MediaIndexResponse,
} from "@tfm-bic/contracts";

import { requestJson } from "./api-request.js";

const enc = encodeURIComponent;

/** Published media for a lesson (M21). `video: null` means none is published yet. */
export async function fetchLessonMedia(lessonId: string): Promise<ContentMediaResponse> {
  return contentMediaResponseSchema.parse(await requestJson(`/media/lessons/${enc(lessonId)}`));
}

/** Published media for a vocabulary item: its video and its pronunciation clips. */
export async function fetchVocabularyMedia(vocabularyId: string): Promise<ContentMediaResponse> {
  return contentMediaResponseSchema.parse(
    await requestJson(`/media/vocabulary/${enc(vocabularyId)}`),
  );
}

/** Recorded pronunciations of a grammar reference topic's forms (M23). */
export async function fetchGrammarMedia(topicId: string): Promise<ContentMediaResponse> {
  return contentMediaResponseSchema.parse(await requestJson(`/media/grammar/${enc(topicId)}`));
}

/** Which content has media — for badges and the video library. */
export async function fetchMediaIndex(): Promise<MediaIndexResponse> {
  return mediaIndexResponseSchema.parse(await requestJson("/media"));
}
