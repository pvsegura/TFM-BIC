import { createLanguageId } from "../../language/language-id.js";
import { createLevelId } from "../../language/level-id.js";
import { createVideoDefinitionId } from "../video-definition-id.js";
import type { VideoDefinition } from "../video-definition.js";
import type { VideoGenerationJob } from "../video-generation-job.js";

/**
 * Builders for well-formed video data, shared by every layer's tests (through
 * `@tfm-bic/domain/testing`). Test-only: never import this from production code.
 */
export function makeVideoDefinition(overrides: Partial<VideoDefinition> = {}): VideoDefinition {
  return {
    id: createVideoDefinitionId("pl-a1-nasal-vowels-demo"),
    languageId: createLanguageId("pl"),
    levelId: createLevelId("a1"),
    status: "published",
    order: 10,
    instructionLanguage: createLanguageId("en"),
    title: "Nasal vowels: ą and ę",
    description: "A short demo video introducing Polish's two nasal vowels.",
    relatedContentId: "pl-ipa-onasal",
    scriptPath: "pl-a1-nasal-vowels-demo",
    ...overrides,
  };
}

export function makeVideoGenerationJob(
  overrides: Partial<VideoGenerationJob> = {},
): VideoGenerationJob {
  const now = new Date("2026-01-01T10:00:00.000Z");
  return {
    id: "11111111-1111-4111-8111-111111111111",
    userId: "user-1",
    videoDefinitionId: createVideoDefinitionId("pl-a1-nasal-vowels-demo"),
    status: "queued",
    providerJobReference: null,
    mediaReference: null,
    errorCategory: null,
    createdAt: now,
    updatedAt: now,
    completedAt: null,
    ...overrides,
  };
}
