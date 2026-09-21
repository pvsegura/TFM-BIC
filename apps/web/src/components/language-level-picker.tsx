import type { LanguageLevelsResponse } from "@tfm-bic/contracts";
import type { ReactNode } from "react";

import { useLanguageLevels, useLanguages } from "../hooks/use-catalog.js";
import { isNotFoundError } from "../services/api-error.js";
import { LoadError, NotFoundNotice } from "./catalog-notices.js";
import { LanguageSelector } from "./language-selector.js";
import { LevelSelector } from "./level-selector.js";

export interface LanguageLevelPickerProps {
  languageCode: string | undefined;
  levelId: string | undefined;
  getLanguageHref: (languageCode: string) => string;
  getLevelHref: (languageCode: string, levelId: string) => string;
  /** What to show for a selected level the catalog says is `available` — only
   * such a level is ever asked for, so a planned one never requests anything. */
  renderAvailableLevel: (languageCode: string, levelId: string) => ReactNode;
}

function LanguageSection({
  selectedCode,
  getHref,
}: {
  selectedCode: string | undefined;
  getHref: (languageCode: string) => string;
}) {
  const languagesQuery = useLanguages();

  let body: ReactNode;
  if (languagesQuery.isPending) {
    body = <p role="status">Loading languages…</p>;
  } else if (languagesQuery.isError) {
    body = (
      <LoadError
        message="We couldn't load the languages. Please try again."
        onRetry={() => void languagesQuery.refetch()}
      />
    );
  } else if (languagesQuery.data.languages.length === 0) {
    body = <p>No languages are available yet.</p>;
  } else {
    body = (
      <LanguageSelector
        languages={languagesQuery.data.languages}
        selectedCode={selectedCode}
        getHref={getHref}
      />
    );
  }

  return (
    <section aria-labelledby="language-heading" className="mt-6">
      <h2 id="language-heading" className="mb-3 text-lg font-semibold">
        Language
      </h2>
      {body}
    </section>
  );
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
      <NotFoundNotice title="Level not found" message="This language does not offer that level." />
    );
  }
  if (level.status !== "available") {
    return (
      <p role="status" className="mt-6">
        {level.label} is coming soon for {levels.language.name}. There is no content to show yet.
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
        Loading levels…
      </p>
    );
  }
  if (levelsQuery.isError) {
    if (isNotFoundError(levelsQuery.error)) {
      return (
        <NotFoundNotice title="Language not found" message="That language is not available." />
      );
    }
    return (
      <LoadError
        message="We couldn't load the levels. Please try again."
        onRetry={() => void levelsQuery.refetch()}
      />
    );
  }

  const levels = levelsQuery.data;
  return (
    <>
      <section aria-labelledby="level-heading" className="mt-6">
        <h2 id="level-heading" className="mb-3 text-lg font-semibold">
          Level for {levels.language.name}
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
      <LanguageSection selectedCode={languageCode} getHref={getLanguageHref} />
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
