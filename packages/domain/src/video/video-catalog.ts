import { isPublished } from "../content/content-status.js";
import type { LanguageId } from "../language/language-id.js";
import type { LanguageLevel } from "../language/language-level.js";
import type { LevelId } from "../language/level-id.js";
import { videoDefinitionIdBelongsToLanguage } from "./video-definition-id.js";
import type { VideoDefinition } from "./video-definition.js";

/** What the video rules need to know about the rest of the catalog. */
export interface VideoCatalogContext {
  languageIds: ReadonlySet<LanguageId>;
  /** The declared availability of a language's level, or `undefined` when it does not declare it. */
  levelStatusOf: (languageId: LanguageId, levelId: LevelId) => LanguageLevel["status"] | undefined;
}

/**
 * The video rules no single file can see: identity (an id is unique everywhere and namespaced by
 * its language), ordering, and honest availability — a *published* definition is held to the same
 * standard as every other content kind: it must be in a level its language declares `available`.
 * Drafts are exempt: they are being prepared.
 *
 * Problems are appended to `issues`, so an author fixes them all in one pass.
 */
export function validateVideoDefinitions(
  videoDefinitions: readonly VideoDefinition[],
  context: VideoCatalogContext,
  issues: string[],
): void {
  const ids = new Set<string>();
  const orders = new Set<string>();

  for (const definition of videoDefinitions) {
    const { id, languageId, levelId } = definition;

    if (ids.has(id)) {
      issues.push(`Duplicate video definition id "${id}".`);
    }
    ids.add(id);

    if (!context.languageIds.has(languageId)) {
      issues.push(`Video definition "${id}" references unknown language "${languageId}".`);
      continue;
    }
    if (!videoDefinitionIdBelongsToLanguage(id, languageId)) {
      issues.push(`Video definition id "${id}" must start with its language id "${languageId}-".`);
    }

    const status = context.levelStatusOf(languageId, levelId);
    if (status === undefined) {
      issues.push(
        `Video definition "${id}" is in level "${levelId}", which language "${languageId}" does not declare.`,
      );
      continue;
    }

    const orderKey = `${languageId}/${levelId}#${String(definition.order)}`;
    if (orders.has(orderKey)) {
      issues.push(
        `Video definition "${id}" reuses order ${String(definition.order)} in ${languageId}/${levelId}.`,
      );
    }
    orders.add(orderKey);

    if (isPublished(definition) && status !== "available") {
      issues.push(
        `Published video definition "${id}" is in ${languageId}/${levelId}, which is not available.`,
      );
    }
  }
}
