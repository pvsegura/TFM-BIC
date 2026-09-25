import type {
  ContentCatalog,
  NewVideoGenerationJob,
  VideoDefinition,
  VideoDefinitionId,
  VideoGenerationJob,
} from "@tfm-bic/domain";
import { makeVideoDefinition } from "@tfm-bic/domain/testing";

import { makeSampleCatalog } from "../../content/test-support/fakes.js";
import type { VideoDefinitionRepository } from "../ports/video-definition-repository.js";
import type { VideoGenerationJobRepository } from "../ports/video-generation-job-repository.js";
import type {
  VideoGenerationRequest,
  VideoGenerationResult,
  VideoGenerationService,
} from "../ports/video-generation-service.js";

/** In-memory `VideoDefinitionRepository` for application and HTTP-layer tests. Test-only. */
export class FakeVideoDefinitionRepository implements VideoDefinitionRepository {
  definitions: VideoDefinition[];

  constructor(definitions: readonly VideoDefinition[] = []) {
    this.definitions = [...definitions];
  }

  findById(videoDefinitionId: VideoDefinitionId): Promise<VideoDefinition | null> {
    return Promise.resolve(this.definitions.find((d) => d.id === videoDefinitionId) ?? null);
  }
}

/** A deterministic, UUID-*shaped* id (version 4, variant 8) — not a real random UUID (this
 * package is I/O- and Node-API-free by design), but shaped so it satisfies the same `z.uuid()`
 * contract the real, Postgres-generated id does. */
function fakeJobId(sequence: number): string {
  const hex = sequence.toString(16).padStart(12, "0");
  return `00000000-0000-4000-8000-${hex}`;
}

/** In-memory `VideoGenerationJobRepository`, assigning sequential, UUID-shaped ids like a real
 * insert would. Test-only. */
export class FakeVideoGenerationJobRepository implements VideoGenerationJobRepository {
  readonly jobs: VideoGenerationJob[] = [];
  private nextId = 1;

  create(job: NewVideoGenerationJob): Promise<VideoGenerationJob> {
    const stored: VideoGenerationJob = { ...job, id: fakeJobId(this.nextId) };
    this.nextId += 1;
    this.jobs.push(stored);
    return Promise.resolve(stored);
  }

  findById(jobId: string): Promise<VideoGenerationJob | null> {
    return Promise.resolve(this.jobs.find((j) => j.id === jobId) ?? null);
  }

  update(job: VideoGenerationJob): Promise<void> {
    const index = this.jobs.findIndex((j) => j.id === job.id);
    if (index !== -1) {
      this.jobs[index] = job;
    }
    return Promise.resolve();
  }
}

/**
 * A minimal, application-layer-only double for `VideoGenerationService` — resolves or rejects on
 * command. Distinct from `packages/data`'s `FakeVideoGenerationService` (the real, shippable
 * dev/test/CI adapter with deterministic named scenarios): this one exists only so use-case tests
 * never depend on `packages/data`, keeping the dependency direction the hexagonal layering
 * requires.
 */
export class StubVideoGenerationService implements VideoGenerationService {
  private outcome: (() => Promise<VideoGenerationResult>) | null = null;
  readonly calls: VideoGenerationRequest[] = [];

  resolveWith(result: VideoGenerationResult): void {
    this.outcome = () => Promise.resolve(result);
  }

  rejectWith(error: Error): void {
    this.outcome = () => Promise.reject(error);
  }

  generate(request: VideoGenerationRequest): Promise<VideoGenerationResult> {
    this.calls.push(request);
    if (!this.outcome) {
      throw new Error(
        "StubVideoGenerationService: call resolveWith()/rejectWith() before generate().",
      );
    }
    return this.outcome();
  }
}

/** `makeSampleCatalog()`'s languages plus one published video definition for `pl`/`a1`. */
export function makeVideoCatalog(): ContentCatalog {
  const catalog = makeSampleCatalog();
  const [pl] = catalog.languages;
  const plId = pl!.code;

  return { ...catalog, videoDefinitions: [makeVideoDefinition({ languageId: plId })] };
}
