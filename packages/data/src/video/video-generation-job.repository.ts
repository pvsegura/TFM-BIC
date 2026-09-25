import type { VideoGenerationJobRepository } from "@tfm-bic/application";
import {
  createVideoDefinitionId,
  type NewVideoGenerationJob,
  type VideoGenerationJob,
} from "@tfm-bic/domain";
import { eq } from "drizzle-orm";

import type { VideoDb } from "./db/client.js";
import { videoGenerationJobs } from "./db/schema.js";

function toJob(row: typeof videoGenerationJobs.$inferSelect): VideoGenerationJob {
  return {
    id: row.id,
    userId: row.userId,
    // Validated again on the way out: a row that somehow holds a malformed id fails loudly here
    // instead of leaking an unchecked string to callers.
    videoDefinitionId: createVideoDefinitionId(row.videoDefinitionId),
    status: row.status,
    providerJobReference: row.providerJobReference,
    mediaReference: row.mediaReference,
    errorCategory: row.errorCategory,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    completedAt: row.completedAt,
  };
}

/**
 * A student's video generation jobs in Postgres. Unlike phonetics/vocabulary progress, this is a
 * plain insert-then-update table, not an atomic upsert: a job is always created once
 * (`RequestVideoGenerationUseCase` never races two creations for the same request) and then
 * updated in place as the domain's transition functions move it through its lifecycle. Every
 * timestamp is the caller's, never the database's `now()`.
 */
export class DrizzleVideoGenerationJobRepository implements VideoGenerationJobRepository {
  constructor(private readonly db: VideoDb) {}

  async create(job: NewVideoGenerationJob): Promise<VideoGenerationJob> {
    const [row] = await this.db
      .insert(videoGenerationJobs)
      .values({
        userId: job.userId,
        videoDefinitionId: job.videoDefinitionId,
        status: job.status,
        providerJobReference: job.providerJobReference,
        mediaReference: job.mediaReference,
        errorCategory: job.errorCategory,
        createdAt: job.createdAt,
        updatedAt: job.updatedAt,
        completedAt: job.completedAt,
      })
      .returning();
    if (!row) {
      throw new Error("Insert into video_generation_jobs returned no row.");
    }
    return toJob(row);
  }

  async findById(jobId: string): Promise<VideoGenerationJob | null> {
    const [row] = await this.db
      .select()
      .from(videoGenerationJobs)
      .where(eq(videoGenerationJobs.id, jobId));
    return row ? toJob(row) : null;
  }

  async update(job: VideoGenerationJob): Promise<void> {
    await this.db
      .update(videoGenerationJobs)
      .set({
        status: job.status,
        providerJobReference: job.providerJobReference,
        mediaReference: job.mediaReference,
        errorCategory: job.errorCategory,
        updatedAt: job.updatedAt,
        completedAt: job.completedAt,
      })
      .where(eq(videoGenerationJobs.id, job.id));
  }
}
