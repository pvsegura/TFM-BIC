import {
  GetContentUseCase,
  ListContentUseCase,
  ListLanguageLevelsUseCase,
  ListLanguagesUseCase,
} from "@tfm-bic/application";

import type { ContentDependencies } from "./content-dependencies.js";

export interface ContentUseCases {
  listLanguages: ListLanguagesUseCase;
  listLanguageLevels: ListLanguageLevelsUseCase;
  listContent: ListContentUseCase;
  getContent: GetContentUseCase;
}

/** Composition-root wiring only — see content-dependencies.ts. */
export function createContentUseCases(deps: ContentDependencies): ContentUseCases {
  return {
    listLanguages: new ListLanguagesUseCase(deps.contentRepository),
    listLanguageLevels: new ListLanguageLevelsUseCase(deps.contentRepository),
    listContent: new ListContentUseCase(deps.contentRepository),
    getContent: new GetContentUseCase(deps.contentRepository),
  };
}
