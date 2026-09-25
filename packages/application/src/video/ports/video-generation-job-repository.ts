import type { NewVideoGenerationJob, VideoGenerationJob } from "@tfm-bic/domain";

/**
 * Where generation jobs are kept. Owned by this layer, implemented in `packages/data`
 * (Drizzle/Postgres). Unlike exercise attempts or the points ledger, a job's row is mutated as it
 * moves through its lifecycle (`queued -> processing -> completed|failed`) — `update` persists
 * exactly the transition the domain functions already computed, never a partial write.
 */
export interface VideoGenerationJobRepository {
  /** Inserts a new job and returns it with its assigned id. */
  create(job: NewVideoGenerationJob): Promise<VideoGenerationJob>;
  findById(jobId: string): Promise<VideoGenerationJob | null>;
  /** Persists a job's current state in full, after a domain transition function produced it. */
  update(job: VideoGenerationJob): Promise<void>;
}
