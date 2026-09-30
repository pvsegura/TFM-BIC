import { readFile } from "node:fs/promises";
import path from "node:path";

import {
  mediaPlanFileSchema,
  narratorsFileSchema,
  type MediaPlanFile,
  type NarratorsFile,
} from "@tfm-bic/contracts";

/**
 * The operator-side media configuration of one language (M21, ADR-031), kept with its content:
 *
 *   content/languages/<lang>/media/narrators.json — narrator characters and how each is voiced
 *   content/languages/<lang>/media/plan.json      — which narrator tells which lesson/category,
 *                                                    generation priority, pictograms per word
 *
 * Provider settings (a Gemini prebuilt voice name, a style instruction) live here, in content the
 * pipeline reads — never in the domain, the API or the browser. No secret is ever in these files.
 */

export type { MediaPlanFile, NarratorsFile };
export type NarratorConfig = NarratorsFile["narrators"][number];

export interface MediaPlan {
  languageId: string;
  narrators: Map<string, NarratorConfig>;
  plan: MediaPlanFile;
}

async function readJson(file: string): Promise<unknown> {
  return JSON.parse(await readFile(file, "utf8")) as unknown;
}

/** Loads and cross-checks a language's media plan; throws with every problem found. */
export async function loadMediaPlan(contentRoot: string, languageId: string): Promise<MediaPlan> {
  const dir = path.join(contentRoot, "languages", languageId, "media");
  const narrators = narratorsFileSchema.parse(await readJson(path.join(dir, "narrators.json")));
  const plan = mediaPlanFileSchema.parse(await readJson(path.join(dir, "plan.json")));

  const problems: string[] = [];
  if (narrators.languageId !== languageId) problems.push("narrators.json: wrong languageId");
  if (plan.languageId !== languageId) problems.push("plan.json: wrong languageId");
  const byId = new Map(narrators.narrators.map((n) => [n.id, n]));
  if (byId.size !== narrators.narrators.length) problems.push("narrators.json: duplicate ids");
  for (const entry of [...plan.lessons, ...plan.vocabularyCategories]) {
    if (!byId.has(entry.narratorId))
      problems.push(`plan.json: unknown narrator ${entry.narratorId}`);
  }
  if (problems.length > 0) throw new Error(`Invalid media plan:\n${problems.join("\n")}`);

  return { languageId, narrators: byId, plan };
}
