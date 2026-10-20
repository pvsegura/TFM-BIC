import {
  GetContentMediaUseCase,
  GetContentUseCase,
  GetGrammarTopicUseCase,
  ListContentUseCase,
  ListGrammarTopicsUseCase,
  ListLanguageLevelsUseCase,
  ListLanguagesUseCase,
  type ContentMediaCatalog,
  type GrammarReferenceRepository,
} from "@tfm-bic/application";

import type { ContentDependencies } from "./content-dependencies.js";

export interface ContentUseCases {
  listLanguages: ListLanguagesUseCase;
  listLanguageLevels: ListLanguageLevelsUseCase;
  listContent: ListContentUseCase;
  getContent: GetContentUseCase;
  listGrammarTopics: ListGrammarTopicsUseCase;
  getGrammarTopic: GetGrammarTopicUseCase;
  getContentMedia: GetContentMediaUseCase;
}

/** An empty reference: what a server built without grammar content (a test fixture) serves. */
const NO_GRAMMAR: GrammarReferenceRepository = {
  listTopics: () => Promise.resolve([]),
  findTopic: () => Promise.resolve(null),
};

/** Media metadata when no manifest is loaded (hand-built test fixtures): nothing published. */
const NO_MEDIA: ContentMediaCatalog = { find: () => undefined, list: () => [] };

/** Composition-root wiring only — see content-dependencies.ts. */
export function createContentUseCases(deps: ContentDependencies): ContentUseCases {
  const grammar = deps.grammarRepository ?? NO_GRAMMAR;
  return {
    listLanguages: new ListLanguagesUseCase(deps.contentRepository),
    listLanguageLevels: new ListLanguageLevelsUseCase(deps.contentRepository),
    listContent: new ListContentUseCase(deps.contentRepository),
    getContent: new GetContentUseCase(deps.contentRepository),
    listGrammarTopics: new ListGrammarTopicsUseCase(grammar),
    getGrammarTopic: new GetGrammarTopicUseCase(grammar),
    getContentMedia: new GetContentMediaUseCase({
      contentRepository: deps.contentRepository,
      vocabulary: deps.vocabularyRepository,
      grammar,
      catalog: deps.mediaCatalog ?? NO_MEDIA,
    }),
  };
}
