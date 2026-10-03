import {
  grammarListResponseSchema,
  grammarTopicResponseSchema,
  type GrammarListResponse,
  type GrammarTopicResponse,
} from "@tfm-bic/contracts";

import { requestJson } from "./api-request.js";

const enc = encodeURIComponent;

/** A language's grammar reference topics (M23). Public: no session needed. */
export async function fetchGrammarTopics(languageCode: string): Promise<GrammarListResponse> {
  return grammarListResponseSchema.parse(
    await requestJson(`/grammar?language=${enc(languageCode)}`),
  );
}

/** One topic with its tables, notes and examples. */
export async function fetchGrammarTopic(topicId: string): Promise<GrammarTopicResponse> {
  return grammarTopicResponseSchema.parse(await requestJson(`/grammar/${enc(topicId)}`));
}
