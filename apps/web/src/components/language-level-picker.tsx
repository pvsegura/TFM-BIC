import type { LanguageLevelsResponse } from "@verbysia/contracts";
import type { ReactNode } from "react";

import { useLanguageLevels } from "../hooks/use-catalog.js";
import { isNotFoundError } from "../services/api-error.js";
import { LoadError, NotFoundNotice } from "./catalog-notices.js";
import { LanguagePickerSection } from "./language-picker-section.js";
import { LevelSelector } from "./level-selector.js";
import { m } from "../i18n/index.js";

export interface LanguageLevelPickerProps {
  languageCode: string | undefined;
  levelId: string | undefined;
  getLanguageHref: (languageCode: string) => string;
  getLevelHref: (languageCode: string, levelId: string) => string;
  /** What to show for a selected level the catalog says is `available` — only
   * such a level is ever asked for, so a planned one never requests anything. */
  renderAvailableLevel: (languageCode: string, levelId: string) => ReactNode;
}

function LevelDetail({
  levels,
  languageCode,
  levelId,
  renderAvailableLevel,
}: {
  levels: LanguageLevelsResponse;
  languageCode: string;
  levelId: string;
  renderAvailableLevel: LanguageLevelPickerProps["renderAvailableLevel"];
}) {
  const level = levels.levels.find((candidate) => candidate.id === levelId);
  if (!level) {
    return (
      <NotFoundNotice
        title={m.learn.catalog.levelNotFound}
        message={m.learn.catalog.levelNotOffered}
      />
    );
  }
  if (level.status !== "available") {
    return (
      <p role="status" className="mt-6">
        {m.learn.catalog.levelComingSoon(level.id.toUpperCase())}
      </p>
    );
  }
  return <>{renderAvailableLevel(languageCode, levelId)}</>;
}

function LevelSection({
  languageCode,
  levelId,
  getLevelHref,
  renderAvailableLevel,
}: {
  languageCode: string;
  levelId: string | undefined;
  getLevelHref: LanguageLevelPickerProps["getLevelHref"];
  renderAvailableLevel: LanguageLevelPickerProps["renderAvailableLevel"];
}) {
  const levelsQuery = useLanguageLevels(languageCode);

  if (levelsQuery.isPending) {
    return (
      <p role="status" className="mt-6">
        {m.learn.catalog.loadingLevels}
      </p>
    );
  }
  if (levelsQuery.isError) {
    if (isNotFoundError(levelsQuery.error)) {
      return (
        <NotFoundNotice
          title={m.learn.catalog.languageNotFound}
          message={m.learn.catalog.languageNotAvailable}
        />
      );
    }
    return (
      <LoadError message={m.learn.catalog.levelsError} onRetry={() => void levelsQuery.refetch()} />
    );
  }

  const levels = levelsQuery.data;
  return (
    <>
      <section aria-labelledby="level-heading" className="mt-6">
        <h2 id="level-heading" className="mb-3 text-lg font-semibold">
          {m.learn.catalog.levelHeading(
            m.learn.languageNames[languageCode] ?? levels.language.name,
          )}
        </h2>
        <LevelSelector
          levels={levels.levels}
          selectedId={levelId}
          getHref={(id) => getLevelHref(languageCode, id)}
        />
      </section>
      {levelId === undefined ? null : (
        <LevelDetail
          levels={levels}
          languageCode={languageCode}
          levelId={levelId}
          renderAvailableLevel={renderAvailableLevel}
        />
      )}
    </>
  );
}

/**
 * The language → level chooser shared by every page that works "for one language
 * and level" (the public content browser and the lessons page): the catalog
 * decides what exists and what is selectable, the caller decides where each
 * choice links and what an available level shows. Nothing here names a language.
 */
export function LanguageLevelPicker({
  languageCode,
  levelId,
  getLanguageHref,
  getLevelHref,
  renderAvailableLevel,
}: LanguageLevelPickerProps) {
  return (
    <>
      <LanguagePickerSection
        headingId="language-heading"
        selectedCode={languageCode}
        getHref={getLanguageHref}
      />
      {languageCode === undefined ? null : (
        <LevelSection
          languageCode={languageCode}
          levelId={levelId}
          getLevelHref={getLevelHref}
          renderAvailableLevel={renderAvailableLevel}
        />
      )}
    </>
  );
}
