import path from "node:path";

import type { GrammarReferenceRepository } from "@tfm-bic/application";
import { grammarFileSchema } from "@tfm-bic/contracts";
import type { ContentCatalog, GrammarTopic, GrammarTopicId, LanguageId } from "@tfm-bic/domain";

import type { ContentIssue } from "./content-validation.error.js";
import { describeSchemaIssue, readDirectory, readJson } from "./load-content-catalog.js";

export type LoadGrammarResult =
  { ok: true; topics: GrammarTopic[] } | { ok: false; issues: ContentIssue[] };

/**
 * Reads the grammar reference (M23) — `content/languages/<languageId>/grammar/<topicId>.json` —
 * and checks it against the already-validated catalog: the language must be declared, the file
 * must sit in its language's folder and be named after its id, the id must carry the language
 * prefix and be unique, a level must be one the language declares, and a published topic's level
 * must be available. Returns every problem, like the catalog loader. Only paths found by listing
 * the tree are read; no request input ever reaches here.
 */
export async function loadGrammarReference(
  contentRoot: string,
  catalog: Pick<ContentCatalog, "languages" | "languageLevels">,
): Promise<LoadGrammarResult> {
  const issues: ContentIssue[] = [];
  const topics: GrammarTopic[] = [];
  const seen = new Set<string>();
  const orders = new Set<string>();

  for (const language of catalog.languages) {
    const dir = path.join(contentRoot, "languages", language.code, "grammar");
    for (const entry of (await readDirectory(dir)) ?? []) {
      if (!entry.isFile() || !entry.name.endsWith(".json")) continue;
      const location = `languages/${language.code}/grammar/${entry.name}`;
      const raw = await readJson(path.join(dir, entry.name), location, issues);
      if (raw === undefined) continue;
      const parsed = grammarFileSchema.safeParse(raw);
      if (!parsed.success) {
        for (const issue of parsed.error.issues) {
          issues.push({ location, message: describeSchemaIssue(issue) });
        }
        continue;
      }
      const file = parsed.data;
      const problems: string[] = [];
      if (file.languageId !== language.code)
        problems.push(
          `languageId "${file.languageId}" does not match its folder "${language.code}".`,
        );
      if (entry.name !== `${file.id}.json`)
        problems.push(`File must be named "${file.id}.json" (its id).`);
      if (!file.id.startsWith(`${language.code}-`))
        problems.push(`id "${file.id}" must start with its language prefix "${language.code}-".`);
      if (seen.has(file.id)) problems.push(`Duplicate grammar topic id "${file.id}".`);
      const orderKey = `${language.code}/${file.category}/${String(file.order)}`;
      if (orders.has(orderKey))
        problems.push(
          `order ${String(file.order)} is already used in category "${file.category}".`,
        );
      if (file.levelId !== undefined) {
        const level = catalog.languageLevels.find(
          (l) => l.languageId === language.code && l.levelId === file.levelId,
        );
        if (!level)
          problems.push(`levelId "${file.levelId}" is not declared by "${language.code}".`);
        else if (file.status === "published" && level.status !== "available")
          problems.push(
            `A published topic cannot belong to the unavailable level "${file.levelId}".`,
          );
      }
      seen.add(file.id);
      orders.add(orderKey);
      if (problems.length > 0) {
        for (const message of problems) issues.push({ location, message });
        continue;
      }
      topics.push({ ...file });
    }
  }

  return issues.length === 0 ? { ok: true, topics } : { ok: false, issues };
}

/** A `GrammarReferenceRepository` over the validated topics, held in memory. Read-only. */
export class CatalogGrammarRepository implements GrammarReferenceRepository {
  private readonly byLanguage = new Map<LanguageId, GrammarTopic[]>();
  private readonly byId = new Map<GrammarTopicId, GrammarTopic>();

  constructor(topics: readonly GrammarTopic[]) {
    for (const topic of topics) {
      const siblings = this.byLanguage.get(topic.languageId) ?? [];
      siblings.push(topic);
      this.byLanguage.set(topic.languageId, siblings);
      this.byId.set(topic.id, topic);
    }
  }

  listTopics(languageId: LanguageId): Promise<readonly GrammarTopic[]> {
    return Promise.resolve(this.byLanguage.get(languageId) ?? []);
  }

  findTopic(topicId: GrammarTopicId): Promise<GrammarTopic | null> {
    return Promise.resolve(this.byId.get(topicId) ?? null);
  }
}
