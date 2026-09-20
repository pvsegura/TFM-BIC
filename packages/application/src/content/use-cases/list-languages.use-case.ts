import type { Language } from "@tfm-bic/domain";

import type { ContentRepository } from "../ports/content-repository.js";

function compareLanguages(a: Language, b: Language): number {
  if (a.name !== b.name) {
    return a.name < b.name ? -1 : 1;
  }
  return a.code < b.code ? -1 : a.code > b.code ? 1 : 0;
}

/**
 * The languages a student can choose from: every active language, ordered by
 * name (then code) so the list never depends on how the repository happens to
 * enumerate them. Identical for every language — nothing here knows any code.
 */
export class ListLanguagesUseCase {
  constructor(private readonly contentRepository: ContentRepository) {}

  async execute(): Promise<Language[]> {
    const languages = await this.contentRepository.listLanguages();
    return languages.filter((language) => language.isActive).sort(compareLanguages);
  }
}
