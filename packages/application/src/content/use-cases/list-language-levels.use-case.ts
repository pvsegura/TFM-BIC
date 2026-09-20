import {
  getLevel,
  LanguageNotFoundError,
  type Language,
  type LanguageId,
  type LevelId,
  type LevelStatus,
} from "@tfm-bic/domain";

import type { ContentRepository } from "../ports/content-repository.js";

export interface ListLanguageLevelsInput {
  languageId: LanguageId;
}

export interface LanguageLevelView {
  id: LevelId;
  label: string;
  status: LevelStatus;
}

export interface ListLanguageLevelsResult {
  language: Language;
  levels: LanguageLevelView[];
}

/**
 * The CEFR levels one language declares, with their availability, lowest
 * first. A `planned` level is included so the UI can show "coming soon", but
 * it is not selectable. Levels the language does not declare are absent —
 * the full A1-C2 scale is never assumed to exist.
 */
export class ListLanguageLevelsUseCase {
  constructor(private readonly contentRepository: ContentRepository) {}

  async execute(input: ListLanguageLevelsInput): Promise<ListLanguageLevelsResult> {
    const language = await this.contentRepository.findLanguage(input.languageId);
    if (!language?.isActive) {
      throw new LanguageNotFoundError(input.languageId);
    }

    const declared = await this.contentRepository.listLanguageLevels(input.languageId);
    const levels = declared
      .map((entry) => ({ level: getLevel(entry.levelId), status: entry.status }))
      .sort((a, b) => a.level.rank - b.level.rank)
      .map(({ level, status }) => ({ id: level.id, label: level.label, status }));

    return { language, levels };
  }
}
